# Migrate Tasking Manager from version 2 to version 3

Migrating from TM2 to TM3 consists of two main parts: 1) installing the new TM3 application and setting up its unpopulated database and 2) migrating the data from the original TM2 database to the new TM3 database.

## Installation

The method by which you install TM3 on your own computer will vary, but you should be in the following position to continue on with the migration:

* You have downloaded a local copy of the TM3 repository on your computer.
* You have [installed python3.6 (preferably in a virtual environment) and all of the requirements via pip](https://github.com/hotosm/tasking-manager#dependencies).
* You have [installed all of the nodeJS modules in the client folder and gulp built the client](https://github.com/hotosm/tasking-manager#client-development).
* You have [set all the environmental variables needed to run the TM3](https://github.com/hotosm/tasking-manager#environment-vars).
* You have [created a new database for TM3](https://github.com/hotosm/tasking-manager/wiki/Dev-Ops) with the same owner as your TM2 database.
* You have [populated the database schema for TM3 using alembic](https://github.com/hotosm/tasking-manager#creating-the-db).

A check to ensure all of these conditions are met is to start the TM3 app, launch the main homepage , and click on while watching the console. It will say there are currently no projects, which is expected since you have a skeleton database, but you should make sure no errors are thrown when the application tries checking for projects. If the page loads successfully and no errors occur, then you should be set!

### Installation Example Walkthroughs

A guide to installing TM3 from scratch on a fresh Ubuntu install is available at https://github.com/hotosm/tasking-manager/wiki/Client-Install-Script-for-Ubuntu-16.04.

A guide to installing TM3 from scratch on a fresh Centos install is available at https://github.com/hotosm/tasking-manager/wiki/Deploying-on-Centos-7-using-Apache-or-Nginx.


## Database Migration

With the empty database for TM3 created, we can now migrate all the data from the TM2 installation. A database migration script is included to assist in this process. The beginning of this file contains important information regarding the assumptions of your prior database name and permissions, so please read it. That text will walk you through backing up your old TM2 database and creating a new temporary database for your TM2 data--though not required, it is recommended.

The database migration script is available at https://github.com/hotosm/tasking-manager/blob/master/devops/tm2-pg-migration/migrationscripts.sql.

## After Migration

If you followed the instructions in the migration script, you should have three databases: the original TM2, the temporary TM2 ("hotold"), and the new TM3 ("hotnew"). You can rename the TM3 database to something more intuitive or meaningful:

```
psql -U hottm -c "ALTER DATABASE hotnew rename to new-tasking-manager;"
```

You can remove the temporary TM2 database:

```
# PLEASE ONLY RUN THIS IF YOU HAVE FOLLOWED THE 
#   INSTRUCTIONS IN THE MIGRATION SCRIPT!
psql -U hottm -c "DROP DATABASE hotold;"
```

It is up to you when you feel comfortable removing the original TM2 database. You may also want to manually `vacuum`.

## References and Thanks

This guide was compiled through personal experience and input from other users who have endured this process. A big thanks to [OpenStreetMap Colombia](https://github.com/kleper/Cartografia) and [@wildintellect](https://github.com/hotosm/tasking-manager/issues/1183) for their help and contributions.
