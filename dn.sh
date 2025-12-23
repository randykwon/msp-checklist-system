cd /opt
sudo rm -rf msp-checklist-system
sudo git clone https://github.com/randykwon/msp-checklist-system.git
cd msp-checklist-system
sudo chmod +x *.sh
sudo ./amazon-linux-install.sh
sudo ./ubuntu-deploy.sh
sudo ./immediate-lightningcss-fix.sh
sudo ./amazon-linux-quick-setup.sh
sudo ./robust-install.sh

