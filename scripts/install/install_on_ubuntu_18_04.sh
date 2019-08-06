#!/bin/bash
#
# Script to install the Tasking Manager on Ubuntu 18.04
#

# Ensure being run on the supported operating system
distribution=$(lsb_release -si)
version=$(lsb_release -sc)

if [ "$distribution" != "Ubuntu" ] || [ "$version" != "bionic" ]; then
  echo -e "ERROR: Your operating system is not supported by this installation script"
  exit
fi

# Make sure the system is up-to-date
sudo apt update && sudo apt -y upgrade &&

# Install general tools
sudo apt install -y build-essential curl git &&

# Install Python
sudo apt install -y python3 python3-dev python3-venv &&

# Install the database
sudo apt install -y postgresql-10 libpq-dev postgresql-server-dev-10 postgresql-10-postgis-2.4 postgresql-10-postgis-scripts &&

# Install Node
sudo apt -y install nodejs npm &&
sudo npm install -g gulp gulp-cli karma karma-jasmine karma-chrome-launcher &&

## Obtain the tasking manager
git clone https://github.com/hotosm/tasking-manager.git &&

## Prepare the tasking manager
cd tasking-manager/ &&
python3 -m venv ./venv &&
. ./venv/bin/activate &&
pip install --upgrade pip &&
pip install -r requirements.txt &&
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf && sudo sysctl -p &&

# Set up configuration
# Sets db endpoint to localhost.
cp example.env tasking-manager.env &&
sed -i '/POSTGRES_ENDPOINT/s/^# //g' tasking-manager.env &&

# Set up data base
sudo -u postgres psql -c "CREATE USER tm WITH PASSWORD 'tm';" &&
sudo -u postgres createdb -T template0 tasking-manager -E UTF8 -O tm &&
sudo -u postgres psql -d tasking-manager -c "CREATE EXTENSION postgis;" &&

# Initiate database
./venv/bin/python3 manage.py db upgrade &&

# Assamble the tasking manager interface
cd client/ &&
npm install &&
gulp build &&
cd ../ &&

## Please edit the tasking-manager.env as indicated in the README.md ##

# Start the tasking manager
./venv/bin/python manage.py runserver -d
