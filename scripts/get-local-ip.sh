#!/bin/bash
# Script para detectar o IP local da máquina na rede

# Tenta diferentes métodos para obter o IP
get_ip() {
  # Método 1: ip command (Linux moderno)
  if command -v ip >/dev/null 2>&1; then
    IP=$(ip -4 addr show | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | grep -v '127.0.0.1' | head -1)
    if [ -n "$IP" ]; then
      echo "$IP"
      return 0
    fi
  fi

  # Método 2: hostname -I (Linux)
  if command -v hostname >/dev/null 2>&1; then
    IP=$(hostname -I 2>/dev/null | awk '{print $1}')
    if [ -n "$IP" ] && [ "$IP" != "127.0.0.1" ]; then
      echo "$IP"
      return 0
    fi
  fi

  # Método 3: ip route (Linux)
  if command -v ip >/dev/null 2>&1; then
    IP=$(ip route get 1.1.1.1 2>/dev/null | awk '{print $7; exit}')
    if [ -n "$IP" ] && [ "$IP" != "127.0.0.1" ]; then
      echo "$IP"
      return 0
    fi
  fi

  # Método 4: ifconfig (fallback)
  if command -v ifconfig >/dev/null 2>&1; then
    IP=$(ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -1)
    if [ -n "$IP" ]; then
      echo "$IP"
      return 0
    fi
  fi

  # Fallback: retorna IP padrão
  echo "192.168.0.18"
  return 1
}

get_ip

