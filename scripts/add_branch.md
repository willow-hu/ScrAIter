假设你现在的主分支是 `main`，你想新建一个叫 `big-change` 的分支来做大改：

---

### 1. 查看当前分支

```bash
git branch
```

带 `*` 的就是你当前所在的分支，一般是 `main`。

---

### 2. 创建并切换到新分支

```bash
git checkout -b big-change
```

这条命令相当于：

* `git branch big-change` （新建分支）
* `git checkout big-change` （切换到新分支）

---

### 3. 确认当前分支

```bash
git branch
```

你会看到类似：

```
* big-change
  main
```

说明现在在 `big-change` 分支上，之后的改动都不会影响 `main`。

---

### 4. 提交修改

在 `big-change` 分支上开发，像平常一样：

```bash
git add .
git commit -m "开始大改"
```

---

### 5. 推送到 GitHub

第一次推送需要指定分支：

```bash
git push -u origin big-change
```

以后再推送就可以直接用：

```bash
git push
```

---

✅ 这样，你的仓库里就会多一个 `big-change` 分支，可以随时切回 `main` 保持干净版本。

---
