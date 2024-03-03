#!/bin/bash

GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}Закрываем доступ к порту 51821 из внешнего интернета! (Убедитесь что вы создали конфиг VPN Wireguard, иначе потеряете доступ к панели.)${NC}"
# Закрыть доступ к порту 51821
iptables -A INPUT -p tcp --dport 51821 -j REJECT
echo -e "${YELLOW}Разрешаем доступ из интерфейса Wireguard${NC}"
# Разрешить доступ к порту 51821 для интерфейса wg0
iptables -I INPUT -i wg0 -p tcp --dport 51821 -j ACCEPT

echo -e "${GREEN}Готово! Доступ к порту 51821 закрыт!${NC}"

echo -e "${RED}Если вдруг вы забыли создать себе конфиг Wireguard для подключения к VPN, то запустите еще раз iptables_patch.sh, он откатит данные правила!${NC}"

