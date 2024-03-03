#!/bin/bash
# Задача данного скрипта в настройки правил между адаптерами и роутингом подключений с AmnesiaWG до основной подсети Wireguard
# ===================ВАЖНО! ВЫПОЛНЯТЬ ТОЛЬКО ПОСЛЕ ТОГО КАК ВСЕ НАСТРОИТЕ (имеется ввиду по инструкции, сервер до этого должен быть чистым)========================
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}Чистим правила докер для настройки таблицы с нуля...${NC}"
#Чистим правила докер для настройки таблицы с нуля
iptables -F
sudo iptables -t filter -F
sudo iptables -t filter -X
sudo iptables -P INPUT ACCEPT
sudo iptables -P FORWARD ACCEPT
sudo iptables -P OUTPUT ACCEPT
sudo iptables -F
sudo iptables -X
sudo iptables -t nat -F
sudo iptables -t nat -X
sudo iptables -t mangle -F
sudo iptables -t mangle -X
sudo iptables -F DOCKER-USER
echo -e "${GREEN}Перезагружаем службу Docker для внесения его правил...${NC}"
systemctl restart docker

#Полная деанон для всех ходов внутри локальной сети (UPD: пока не полный, с Amnesia под походу под натом, но как-то получалось сделать и без него, 
#только данный вариант я не записал, а повторить не получилось, если кто подскажет буду рад!)

#Также необходимо поменять подсети (если вдруг вы изменили мои стандартные), и поменять название адаптера вашей bridge-сети (которую вы создавали с новой, не путать с "bridge" сетью которая родная от самого докера),
#Для этого можно ввести команду ip a или же ip link show и посмотреть название своего интерфейса.
echo -e "${GREEN}Вносим правила для маршрутизации между интерфейсами...${NC}"
iptables -I INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
iptables -A INPUT -i wg0 -s 10.100.0.0/24 -j ACCEPT
iptables -I DOCKER-USER -p tcp -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
iptables -I DOCKER-USER -i amn0 -o br-+ -j ACCEPT
iptables -I DOCKER-USER -i br-+ -o amn0 -j ACCEPT
iptables -t nat -A POSTROUTING -s 10.10.10.0/24 -o ens3 -j MASQUERADE
iptables -t nat -A POSTROUTING -s 10.100.0.0/24 -o ens3 -j MASQUERADE

#Разрешаем переадресацию трафика для интерфейсов wg0, docker0 (bridge-сеть docker)
iptables -A FORWARD -i wg0 -j ACCEPT
iptables -A FORWARD -o wg0 -j ACCEPT
iptables -A FORWARD -i docker0 -j ACCEPT
iptables -A FORWARD -o docker0 -j ACCEPT

echo -e "${GREEN}Правила внесены в IPTABLES!${NC}"

echo -e "${YELLOW}Устанавливаем netfilter-iptables для сохранения правил после перезагрузки сервера${NC}"
sudo apt-get install iptables-persistent
echo -e "${GREEN}Сохраняем правила..${NC}"
sudo netfilter-persistent save
echo -e "${GREEN}ГОТОВО! Вот ваши таблица правил iptables: ${NC}"
sudo iptables-save