import json
import re
from typing import Optional
from cachetools import TTLCache, cached
import geojson
import datetime
from flask import current_app
from geoalchemy2 import Geometry
from geoalchemy2.shape import to_shape
from sqlalchemy.sql.expression import cast, or_
from sqlalchemy import text, desc, func, Time, orm, literal, distinct
from shapely.geometry import shape
from sqlalchemy.dialects.postgresql import ARRAY
import requests
from backend import db
from backend.models.postgis.user import User
from enum import Enum
from backend.models.postgis.utils import (
    timestamp,
    NotFound,
)
from backend.models.postgis.task import Task, TaskHistory
from backend.models.dtos.osmcha_dto import OsmDTO, AddOsmDTO


class OSMcha(db.Model):
    __tablename__ = 'osmcha'

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey("projects.id"), index=True)
    task_id = db.Column(db.Integer)
    changeset_id = db.Column(db.String)
    taskhistory_id = db.Column(db.BigInteger)
    no_of_flags = db.Column(db.Integer)
    reasons = db.Column(db.String)

    def create(self):
        """ Creates and saves the current model to the DB """
        db.session.add(self)
        db.session.commit()

    def update(self):
        """ Updates the DB with the current state of the Task """
        db.session.commit()

    def save(self):
        """ Save changes to db"""
        db.session.commit()

    def delete(self):
        """ Deletes the current model from the DB """
        db.session.delete(self)
        db.session.commit()

    def get_osmcha_details(task_id, project_id):
        '''
        Once the task is mapped corresponding task details is sent to OSMCHA
        All the changesets from OSMCha is retrived and updated in database
        '''

        ## Get the geometry details of the task
        geometry_query = text('select ST_AsGeoJSON(geometry)::json from tasks where project_id= :proj_id and id= :task_id')
        result = db.engine.execute(geometry_query, proj_id=project_id, task_id=task_id).fetchone()
        geometry = result[0]
        coordinates=geometry['coordinates']
        geometry['coordinates']=coordinates[0]

        taskhistory_query = (
            db.session.query(TaskHistory.id, TaskHistory.action_date, TaskHistory.user_id)
            .filter(TaskHistory.task_id==task_id)
            .filter(TaskHistory.project_id==project_id)
            .order_by(TaskHistory.action_date.desc())
            .all()
        )
        name_query = (db.session.query(User.username).filter(User.id==taskhistory_query[0][2])).all()
        name_query = name_query[0]

        taskhistory_id = taskhistory_query[0][0]
        username = name_query[0]
        start_date = taskhistory_query[1][1]
        end_date = taskhistory_query[0][1]
        changeset_id = []
        no_of_flags = 0
        reasons = []

        task_list_query = (
            db.session.query(OSMcha.task_id)
            .filter(OSMcha.task_id==task_id)
            .filter(OSMcha.project_id==project_id)
            .all()
            )
        tasks = []
        if len(task_list_query):
            tasks = task_list_query[0]
        
        osmcha_dto = AddOsmDTO()
        osmcha_dto.project_id = project_id
        osmcha_dto.task_id = task_id
        osmcha_dto.changeset_id = changeset_id
        osmcha_dto.no_of_flags = no_of_flags
        osmcha_dto.reasons = reasons
        osmcha_dto.taskhistory_id = taskhistory_id

        ## API call to OSMCha to fetch the details
        headers = {'Authorization': 'Token 244d8f03e1e0a23a788593ccc61dcd8b34e7825c'}
        geometry["type"]="Polygon"
        geometry=json.dumps(geometry)
        day_diff = end_date-start_date
        day_diff = day_diff.days
        try:
            if day_diff>0:
                url = 'https://osmcha.org/api/v1/changesets/?page=01&page_size=75&geometry='+geometry+'&users='+username+'&date__gte='+str(start_date)+'&date__lte='+str(end_date)
            else:
                url = 'https://osmcha.org/api/v1/changesets/?page=01&page_size=75&geometry='+geometry+'&users='+username+'&date__lte='+str(end_date)
            
            osmcha_response = requests.get(url, headers=headers)
            response = osmcha_response.json()
            if (osmcha_response.status_code==200):
                if len(response['features'])==0:
                    if task_id in tasks:
                        OSMcha.update_osmcha_details(osmcha_dto)
                    else:
                        OSMcha.add_osmcha_details(osmcha_dto)
                else:
                    for i in range(len(response['features'])):
                        changeset_value = response['features'][i]
                        changeset_id.append(changeset_value['id'])
                        get_reasons = changeset_value['properties']
                        if get_reasons['features']!=[]:
                            temp = get_reasons['features']
                            for feature in range(len(temp)):
                                te = get_reasons['features'][feature]
                                re=[]
                                ids = te['reasons']
                                for id_val in range(len(ids)):
                                    for reason in range(len(get_reasons['reasons'])):
                                        t = get_reasons['reasons'][reason]
                                        if ids[id_val]==t['id']:
                                            re.append(t)
                                            break
                                te['reasons'] = re
                                reasons.append(temp[feature])
                        no_of_flags += len(get_reasons['features'])
                        
                    reasons =json.dumps(reasons)
                    changeset_id = json.dumps(changeset_id)
                    osmcha_dto.changeset_id = changeset_id
                    osmcha_dto.no_of_flags = no_of_flags
                    osmcha_dto.reasons = reasons
                    if task_id in tasks:
                        OSMcha.update_osmcha_details(osmcha_dto)
                    else:
                        OSMcha.add_osmcha_details(osmcha_dto)
            else:
                if task_id in tasks:
                    pass
                else:
                    OSMcha.add_osmcha_details(osmcha_dto)
        except:
            if task_id in tasks:
                pass
            else:
                OSMcha.add_osmcha_details(osmcha_dto)

        
    
    def add_osmcha_details(osm_dto: AddOsmDTO):
        """
        Adds the OSMCha details in the osmcha database
        """
        osm_var = OSMcha(project_id=osm_dto.project_id, task_id=osm_dto.task_id, changeset_id=osm_dto.changeset_id, taskhistory_id=osm_dto.taskhistory_id, no_of_flags=osm_dto.no_of_flags, reasons=osm_dto.reasons)
        db.session.add(osm_var)
        db.session.commit()
    
    def update_osmcha_details(osm_dto: AddOsmDTO):
        """
        Updates the OSMCha details for particular task with latest data
        """
        osm_query = text('update osmcha set changeset_id= :ch_id, no_of_flags= :flags, reasons= :reasons where project_id= :proj_id and task_id= :task_id')
        result = db.engine.execute(osm_query, ch_id=osm_dto.changeset_id, flags=osm_dto.no_of_flags, reasons=osm_dto.reasons, proj_id=osm_dto.project_id, task_id=osm_dto.task_id)

