from backend.models.dtos.osmcha_dto import (
    OsmDTO,
)
import datetime
import json
from backend.models.postgis.osmcha import OSMcha
import requests
from backend import db
from backend.services.stats_service import StatsService
from sqlalchemy import text, desc, func, Time, orm, literal, distinct
from backend.models.postgis.utils import ST_AsGeoJSON
from backend.models.postgis.task import Task, TaskHistory, TaskAction
from backend.models.postgis.user import User
from backend.models.dtos.osmcha_dto import AddOsmDTO

class OSMCHA:
    @staticmethod
    def OSM(osm_dto: OsmDTO):
        '''
        Update the OSMCha details in database corresponding to task
        '''
        
        task_query = db.session.query(OSMcha.task_id).filter(OSMcha.project_id==osm_dto.project_id).all()
        tasks = [i[0] for i in task_query]
        
        ## Spatial query to get the geometry details of the task
        geometry_query = text('select ST_AsGeoJSON(geometry)::json from tasks where project_id= :proj_id and id= :task_id')
        
        for i in tasks:
            result = db.engine.execute(geometry_query, proj_id=osm_dto.project_id, task_id=i).fetchone()
            geometry = result[0]
            coordinates=geometry['coordinates']
            geometry['coordinates']=coordinates[0]
            
            taskhistory_query = (
                db.session.query(TaskHistory.id, TaskHistory.action_date, TaskHistory.user_id)
                .filter(TaskHistory.task_id==i)
                .filter(TaskHistory.project_id==osm_dto.project_id)
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
            osmcha_dto = AddOsmDTO()
            osmcha_dto.project_id = osm_dto.project_id
            osmcha_dto.task_id = i
            osmcha_dto.changeset_id = changeset_id
            osmcha_dto.no_of_flags = no_of_flags
            osmcha_dto.reasons = reasons
            osmcha_dto.taskhistory_id = taskhistory_id
            status = {}

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
                        OSMcha.update_osmcha_details(osmcha_dto)
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
                        OSMcha.update_osmcha_details(osmcha_dto)
                        print(osmcha_dto)
                else:
                    OSMcha.update_osmcha_details(osmcha_dto)
                status={'200':"OSM data updated"}
            except:
                status= {'500':'Error in OSMAPI url'}

        return status
    

    @staticmethod
    def get_osm_data(project_id):
        '''
        Get all the summary details of the validation from OSMCha
        '''
        base_query= (db.session.query
            (
                OSMcha.project_id,
                OSMcha.task_id,
                OSMcha.no_of_flags,
                OSMcha.changeset_id,
                OSMcha.reasons
            )
            .filter(OSMcha.project_id==project_id)
            .all()
        )

        ## Get the latest activity details of all the tasks
        summary=[]
        for i in base_query:
            action_query = (
                TaskHistory.query.with_entities(
                    TaskHistory.task_id,
                    TaskHistory.action_date,
                    TaskHistory.user_id,
                )
                .filter(TaskHistory.project_id == project_id)
                .filter(TaskHistory.task_id == i[1])
                .filter(TaskHistory.action != TaskAction.COMMENT.name)
                .order_by(TaskHistory.task_id, TaskHistory.action_date.desc())
                .distinct(TaskHistory.task_id)
                .all()
            )
            user_query = db.session.query(User.username).filter(User.id==action_query[0][2]).all()
            username = user_query[0]
            summary.append({"project_id":i[0],
            "task_id":i[1],
            "no_of_flags":i[2],
            "changeset_id":json.loads(i[3]),
            "reasons":json.loads(i[4]),
            'actionDate':str(action_query[0][1]),
            'actionBy':username[0]})
        osm_lis={'summary':summary}
        
        return osm_lis
