#!/bin/bash
# Задача данного скрипта в смене пароля для AGH и в последующем смена пароля у WG_easy

# Запрашиваем у пользователя, хочет ли изменить пароль для AdGuardHome?
printf "Вы хотите изменить пароль для AGH? (y/n): "
read agh_answer
# Если пользователь отвечает "y" или "Y", запускаем скрипт для изменения пароля
if [[ "$agh_answer" == "y" || "$agh_answer" == "Y" ]]; then
  # Запуск скрипта ufw.sh
  printf "\e[42mЗапуск скрипта agh.sh для изменения параметров AGH...\e[0m\n"
  ./tools/agh.sh
  printf "\e[42mСкрипт agh.sh успешно выполнен.\e[0m\n"
fi

# Предложим пользователю пересоздать контейнеры
printf "Хотите пересоздать контейнеры? (y/n) "

# Считываем ответ пользователя
read answer

# Если пользователь ответил "y", запустим команду пересоздания контейнеров
if [ "$answer" == "y" ]; then
  docker compose up -d --force-recreate
  printf "Контейнеры были успешно пересозданы!\n"
else
  printf "Пересоздание контейнеров отменено.\n"
fi