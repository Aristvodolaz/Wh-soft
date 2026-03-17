# Исправление push 408 (слишком большой объём ~174 МБ)

Сервер обрывает соединение (408), потому что в истории репозитория лежат `node_modules` и `.next`.

## Решение: удалить эти папки из всей истории

Выполнять в **Git Bash** или **PowerShell** из корня репозитория `D:\BluePrint`.

### Вариант A: встроенный git (без установки)

```bash
cd /d/BluePrint
git filter-branch -f --tree-filter "rm -rf web-BluePrint/node_modules web-BluePrint/.next 2>/dev/null; true" --prune-empty -- --all
```

Подождите несколько минут. Затем:

```bash
git push --force --all origin
```

### Вариант B: git-filter-repo (быстрее и надёжнее)

1. Установить один раз: `pip install git-filter-repo`
2. Выполнить:

```bash
cd D:\BluePrint
git filter-repo --path web-BluePrint/node_modules --path web-BluePrint/.next --invert-paths --force
```

3. Remote после filter-repo удаляется — добавьте снова и запушьте:

```bash
git remote add origin https://github.com/Aristvodolaz/Wh-soft.git
git push --force --all origin
git push --force --tags origin
```

---

**Важно:** после очистки истории нужен **force push** (`git push --force`). Если в репозитории работают другие люди, предупредите их и договоритесь о времени.
