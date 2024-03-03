# Предистория
Данную модификация сделана для того, чтобы объединить в одну подсеть те устройства которые еще не поддерживают AmnesiaVPN но работают с Wireguard-ом. 
То есть простыми словами появляется возможность подключаться к серверу как по AmnesiaVPN так и по Wireguard и они будут иметь доступ к одинаковым ресурсам.

# Возможности
1. Создание пользователей Wireguard в Web-панели на порту 51821 **ВАШ_IP:51821**
2. Использование функционала в приложении AmnesiaVPN паралелльно с сервером Wireguard, и все это в контейнерах, что экономит ресурсы сервера.
3. Объединение нескольких подсетей благодаря прокаченному WG-EASY (мною), добавление параметра *allowedIPS* в wg0.json. Например можно объединить несколько домашних сетей под управлением Keenetic или Mikrotik!

# Инструкция по установке
## 1. Установка AmnesiaWG через оф. клиент (все как обычно), единственное, что нужно указать порт сервера 51822 (т.к 51820 и 51821 будут заняты Wireguard-ом)
## 2. Заходим на ssh сервер под root (или своим пользователем)
## 3. Доустанавливаем docker-compose-plugin (потому что амнезия этого не делает :3)
Посмотреть как это делать можно тут (https://docs.docker.com/compose/install/linux/), я покажу как делать для Ubuntu 22.04:
```bash
# Add Docker's official GPG key:
sudo apt-get update
sudo apt-get install ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add the repository to Apt sources:
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update

sudo apt-get install docker-compose-plugin
```
## 4. Готово, теперь перейдем к настройке самомого докер, создадим сначала подсеть для работы с DNS и прочих моментов.
Можете установить свою подсеть, но тогда Вам придется много везде всего менять.

```bash
 docker network create -d bridge --subnet=10.100.0.0/24 nginx-network
```
## 5. Теперь запустим для начала Portainer CE, я его уже поместил в docker-compose (для удобства), запускаем его в корне каталога с проектом командой:

```bash
 docker compose -f docker-compose-portainer.yml up -d
```
## 6. Теперь откроем файл docker-compose.yml, здесь нужно поменять настройки на свои у сервиса WG-EASY на свои, а именно поменять только:
*  WG_HOST и PASSWORD, это нужно для правильной генерации конфигов для WG и входа в Web-панель Wireguard

## 7. После чего сохраняем файл и запускаем Stack Compose командой:

```bash
 docker compose -f docker-compose.yml up -d
```
## 8. Теперь вам необходимо поменять пароль от панели Adguard Home (это наш DNS-сервер фильтрации запросов, там будет показываться информация по каждому клиенту (кто куда ходит и т д, а также фильтрованивание рекламы))
я уже настроил его за Вас, Вам необходимо лишь поменять пароль от панели и зайти, это можно сделать следующей командой в корне проекта ### (делать под рутом или через SUDO), и следовать инструкции скрипта.

```bash
 chmod +x ./change_password_adguard.sh
 chmod +x ./tools/agh.sh
 ./change_password_adguard.sh
```
## 9. Ну и  последнее самое сложное, это маршрутизация между адаптерами, в общем, если Вы не меняли подсети, то изменения вносить не нужно, я уже за Вас все настроил :)

**Пишем команду (либо под root, либо везде добавляем sudo):**

```bash
 chmod +x iptables_patch.sh
 ./iptables_patch.sh
```

## 10. Пункт по желанию!
Если вдруг выхотите закрыть из внешнего интернета доступ к 51821, то нужно запустить еще один скрипт который это делает!
Не забудьте перед этим создать конфиг Wireguard или AmnesiaVPN иначе вы потеряете доступ к панели, итак:

### Вводим команды в корне проекта:
```bash
 chmod +x close_port_wg_ui.sh
 ./close_port_wg_ui.sh
```

После чего можно перезагрузить сервер и проверить все ли работает, если у вас есть какие-то вопросы то обращаться можно ко мне в ТГ, помогу чем смогу:
## [Мой телеграмм](https://m1ndst0rm.t.me)
<!-- # DWG UI - Docker WireGuard (DWG) - Проект одного скрипта 
<img src="https://user-images.githubusercontent.com/50312583/231138618-750b4b04-ade0-4e67-852e-f103030684a9.png" width="400">
### Представляю вам лучшую сборку для самой быстрой настройки VPN сервера на WireGuard
### **DWG-UI** = AdGuard with DoH DNS +  Wireguard with UI (wg-easy) + Unbound 
Тема поддержки на моём форуме:
https://openode.ru/topic/116-dwg-ui/

Версия без UI: https://github.com/DigneZzZ/dwg-cli

## Основная ветка развития будет здесь: Универсальный установщик выбор UI / без UI: https://github.com/DigneZzZ/dwg/

### UPD 05.05.23:  Добавил файл `./change.sh` чтобы можно было менять пароль и логин к AGH.

### [ENGLISH DOCS](https://github.com/DigneZzZ/dwg-ui/blob/main/README_EN.md)

# Требования
* Чистый пустой сервер.
* Поддерживаемые операционные системы: **Ubuntu 20.04, 22.04; Debian 11, Centos 8,9**

Скрипт устанавливает все автоматически.
Все комментарии по скрипту внутри в комментариях

### [4VPS.su](https://4vps.su/account/r/18170) Рекомендую - однозначно! Скорость до 2ГБ\с. В моих тестах самый быстрый был сервер в Швейцарии!
1. Очень хорошая скорость (до 2гб/с)
2. Посуточные тарифы
3. Доступные тарифы мощных сборок.
4. Лояльность к VPN использованию серверов.
### [VDSina.ru](https://vdsina.ru/?partner=rwmhc7jbcg) Рекомендую VPS хостинг - по рефералке скидка 10%!!!: 	
### [AEZA.net](https://aeza.net/?ref=377137)  -  бонус +15% к пополнению
### [Melbicom](https://melbicom.ru/?from=44619)
Достаточно хорошая стабильность и связь в 1гб/с (причем с гарантиями не менее 100мбит\с)
### [Pq.Hosting](https://pq.hosting/?from=45709)
Все критерии закрыты и 1Гб/с
### [Fornex](https://fornex.com/code/jwo1cg/)
Базовый вариант на котором хотел бы отметить своё внимание. Претензий нет, кроме как скорость 100мбит/сек. (но хочется отметить, что скорость эта достаточно стабильная!)


# Самая быстрая установка - 1 минута

Запусти команду на чистом сервере

```bash
bash <(wget -qO- https://raw.githubusercontent.com/DigneZzZ/dwg-ui/main/setup.sh)
```

## Что установится:

0. Сначала установится Git, чтобы можно было скопировать мой репозиторий
1. Docker - последняя версия
2. Docker-compose - последняя версия
3. Wg-easy - интерактивный режим введения пароля для веб
4. AdGuard Home - интерактивный режим создания пользователя и пароля (можно оставить стандартным)
5. Unbound - все в стоке
6. apache2-utils - необходим для генерации хэш-паролей
7. ssh.sh - скрипт для смены порта SSH подключения
8. ufw.sh - скрипт для установки UFW Firewall.
9. Напомнит установить ufw-docker и сам закроет доступ извне! **ВНИМАНИЕ! Запускать только после того как создадите для себя клиента в WireGUARD!!!**

## Автор:

👤 ** Alexey **
* Git: [DigneZzZ](https://github.com/DigneZzZ)
* Site: [OpeNode.RU](https://openode.ru)

# Скриншоты
## Wireguard-Easy Web-UI
![image](https://user-images.githubusercontent.com/50312583/206703310-3bc8f759-91fa-42db-8d43-eca0050c70bf.png)

## Adguard Web-UI
![image](https://user-images.githubusercontent.com/50312583/206703207-f3bd39f1-72c7-458c-9893-ad2126a0d47b.png)



## После установки

### WG-Easy web-ui:
yo.ur.ip.xx:51821 
И останется ввести пароль который задавали на момент установки


### AdGuard HOME 
#### Заходим после установки:
http://10.2.0.100/  

### Login: **admin** 
### Password: **admin**
Пароль по умолчанию, при ручной установке: `a12345678`


## Предустановленный Adlists для Рунета в том числе:
* RU-Adlist
https://easylist-downloads.adblockplus.org/advblock.txt
* BitBlock
https://easylist-downloads.adblockplus.org/bitblock.txt
* Cntblock
https://easylist-downloads.adblockplus.org/cntblock.txt
* EasyList
https://easylist-downloads.adblockplus.org/easylist.txt
* Доп список от Шакала
https://schakal.ru/hosts/alive_hosts_ru_com.txt
* файл с разблокированными r.mail.ru и graph.facebook.com
https://schakal.ru/hosts/hosts_mail_fb.txt
---
* All DNS Servers
https://adguard-dns.io/kb/general/dns-providers/#cloudflare-dns
* DNS Perfomance list:
https://www.dnsperf.com/#!dns-resolvers

# Почему именно AdGuardHome, а не PiHole?
![image](https://user-images.githubusercontent.com/50312583/229718610-cfa5dc9b-08a6-4761-b8e7-f54315afab57.png)

 -->
