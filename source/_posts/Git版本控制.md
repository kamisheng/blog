---
title: Git版本控制
date: 2026-04-14 15:00:51
tags: Git版本控制
categories: 技术工具         # 分类
description: Git版本控制  # 描述
cover: /images/Git.jpg     # 封面图
---

## Git简介

项目也需要一个合适的版本控制系统来使得更好地管理版本迭代，而Git正是因此而诞生的

Git是如何工作的：

![点击查看源网页](https://oss.itbaima.cn/internal/markdown/2023/03/06/ZxY3MGkWRpOLVU6.jpg)

可以看到，它大致分为4个板块：

- 工作目录：存放正在写的代码（当我们新版本开发完成之后，就可以进行新版本的提交）
- 暂存区：暂时保存待提交的内容（新版本提交后会存放到本地仓库）
- 本地仓库：位于电脑上的一个版本控制仓库（存放的就是当前项目各个版本代码的增删信息）
- 远程仓库：位于服务器上的版本控制仓库（服务器上的版本信息可以由本地仓库推送上去，也可以从服务器抓取到本地仓库）

它是一个分布式的控制系统，因此一般情况下每个人的电脑上都有一个本地仓库，由大家共同向远程仓库去推送版本迭代信息。

通过这一系列操作，就可以实现每开发完一个版本或是一个功能，就提交一次新版本，这样就可以很好地控制项目的版本迭代，想回退到之前的版本随时都可以回退，随时查看新版本添加或是删除了的代码

## 安装Git

首先请前往Git官网去下载最新的安装包：https://git-scm.com/download/win

安装Git环境

安装完成后，需要设定用户名和邮箱来区分不同的用户：

```shell
git config --global user.name "Your Name"
git config --global user.email "email@example.com"
```

## 基本命令介绍

### 创建本地仓库

可以将任意一个文件夹作为一个本地仓库，输入：

```shell
git init
```

输入后，会自动生成一个`.git`目录，注意这个目录是一个隐藏目录，而当前目录就是工作目录。

创建成功后可以查看一下当前的一个状态，输入：

```shell
git status
```

如果已经成功配置为Git本地仓库，那么输入后可以看到：

```shell
On branch master

No commits yet
```

这表示还没有向仓库中提交任何内容，也就是一个空的状态。

### 添加和提交

如何使用git来管理文档的版本，创建一个文本文档，随便写入一点内容，接着输入：

```shell
git status
```

添加：

```bash
git add xxx # 文件名
```

提交：

```bash
git commit -m 'Hello World' # 添加提交说明
# -a是add + commit一并执行
```

status四种不同状态:

```bash
git status

On branch master
Your branch is up to date with 'origin/master'.

# ========== 1. 未跟踪 ==========
Untracked files:
  (use "git add <file>..." to include in what will be committed)
        newfile.txt          ← 🔴 红色：新文件，Git 从未见过

# ========== 2. 已修改未暂存 ==========
Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
        modified:   hello.txt    ← 🔴 红色：修改了，但没 add

# ========== 3. 已暂存 ==========
Changes to be committed:
  (use "git restore --staged <file>..." to unstage)
        new file:   test.txt     ← 🟢 绿色：已 add，等待 commit
        modified:   README.md    ← 🟢 绿色：修改已 add
        deleted:    old.txt      ← 🟢 绿色：删除已 add

# ========== 4. 冲突 ==========
Unmerged paths:
  (use "git add <file>..." to mark resolution)
        both modified:   conflicted.txt   ← 红/紫色：合并冲突
```

**红色 = 还没加（需要 add）**
 **绿色 = 加了但没存（需要 commit）**
 **紫/红色 = 打架了（需要解决冲突)**

**log**显示历史记录

默认：

```bash
git log

# 信息唯一ID
# 提交作者
# 提交日期
# 提交说明
commit 7cd36c4b8708bb2bfe84b07848ef5d1a15bc2cd1 (HEAD -> master)
Author: kami <kamisheng66@gmail.com>
Date:   Sat Apr 11 21:34:50 2026 +0800

    second

# 信息唯一ID
# 提交作者
# 提交日期
# 提交说明
commit 63f8d87122df6214ab7cc8766d76229b5a2ace65
Author: kami <kamisheng66@gmail.com>
Date:   Sat Apr 11 21:24:57 2026 +0800

    init sub
```

一行显示：

```bash
git log --oneline

# 信息的唯一ID缩写 + 最近一次提交 + 提交说明
7cd36c4 (HEAD -> master) second 
63f8d87 init sub
```

图形化格式（看分支）:

```bash
git log --oneline --graph --all
```

show显示某次提交的**详细内容**：

```bash
git show 7cd36c4 # 某次消息的唯一ID


commit 7cd36c4b8708bb2bfe84b07848ef5d1a15bc2cd1 (HEAD -> master)
Author: kami <kamisheng66@gmail.com>
Date:   Sat Apr 11 21:34:50 2026 +0800

    second

# 文件差异  a/ 表示修改前的版本  b/ 表示修改后的版本
diff --git a/hello.txt b/hello.txt
# 修改前后的文件索引哈希值（内部标识）
index b6fc4c6..cc442ef 100644
# ---表示修改前，+++表示修改后
--- a/hello.txt
+++ b/hello.txt
# 具体修改：原来是一行，修改后变成了1，2两行
# @@ -旧文件行数范围 +新文件行数范围 @@
@@ -1 +1,2 @@
# -:修改前具体内容(红色)
# +:修改后具体内容(绿色)
-hello
\ No newline at end of file
+hello
+@@
\ No newline at end of file
```

综上：

| 命令             | 看什么                   | 时机               | 类比                   |
| ---------------- | ------------------------ | ------------------ | ---------------------- |
| **`git status`** | 当前**还没保存**的变化   | 修改后、commit 前  | "我改了啥还没存？"     |
| **`git log`**    | 历史**已保存**的提交记录 | 任何时候           | "我之前都干了啥？"     |
| **`git show`**   | 某次提交的**详细内容**   | 想看具体改了什么时 | "某次提交改了啥代码？" |

可以创建一个`.gitignore`文件来确定一个文件忽略列表，如果忽略列表中的文件存在且不是被追踪状态，那么git不会对其进行任何检查：

```yaml
# 这样就会匹配所有以txt结尾的文件
*.txt
# 虽然上面排除了所有txt结尾的文件，但是这个不排除
!666.txt
# 也可以直接指定一个文件夹，文件夹下的所有文件将全部忽略
test/
# 目录中所有以txt结尾的文件，但不包括子目录
xxx/*.txt
# 目录中所有以txt结尾的文件，包括子目录
xxx/**/*.txt
```

### 回滚

当想要回退到过去的版本时，就可以执行回滚操作，执行后，可以将工作空间的内容恢复到指定提交的状态：

```sh
git reset --hard commitID
```

执行后，会直接重置为那个时候的状态。再次查看提交日志之后的日志全部消失了。

那么要是现在想回去可以通过查看所有分支的所有操作记录：

```shell
git reflog


63f8d87 (HEAD -> master) HEAD@{0}: reset: moving to 63f8d87
f127810 HEAD@{1}: reset: moving to f127810
63f8d87 (HEAD -> master) HEAD@{2}: reset: moving to 63f8d87
f127810 HEAD@{3}: commit: gitinore
7cd36c4 HEAD@{4}: commit: second
63f8d87 (HEAD -> master) HEAD@{5}: commit (initial): init sub
```

这样就能找到之前的commitID，再次重置即可

### 创建分支

以下命令来查看当前仓库中存在的分支：

```sh
git branch
```

进入（创建）分支：

```bash
git branch xxx # 分支名字
```

删除分支：

```bash
git branch -d yyds # -D是强制删除
```

选择分支：

```bash
git checkout xxx # 分支名字
```

在不同分支做了不同修改后log里会分开表示
 这里用 `git log --oneline --graph --all` 查看:

```bash
* 5c7e624 (test) check t
| * f5cbada (HEAD -> master) check m
|/
* f127810 gitinore
* 7cd36c4 second
* 63f8d87 init sub
```

合并分支：

```bash
git merge test
```

如果有冲突会得到以下提示：

```bash
Auto-merging hello.txt
CONFLICT (content): Merge conflict in hello.txt
Automatic merge failed; fix conflicts and then commit the result.
```

需要手动改动文件冲突部分再次提交

可以查看一下是哪里发生了冲突：

```sh
git diff
```

log后得到：

```bash
*   808e9eb (HEAD -> master) After fix
|\
| * 5c7e624 (test) check t
* | f5cbada check m
|/
* f127810 gitinore
* 7cd36c4 second
* 63f8d87 init sub
```

### 变基分支

变基操作跟合并不同，合并是分支回到主干的过程，而变基是直接修改分支开始的位置，比如希望将test变基到master上，那么test会将分支起点移动到master最后一次提交位置：

```sh
git rebase master
```

变基后，test分支相当于同步了此前master分支的全部提交

合并：

```
master:  A --- B --- C --- M
              \           /
feature:       D --- E ---
```

变基：

```
变基前
master:  A --- B --- C
              \
feature:       D --- E
 
 
变基后
master:  A --- B --- C
                     \
feature:              D' --- E'
```

### 优选

还可以选择其将他分支上的提交作用于当前分支上，这种操作称为cherrypick：

```sh
git cherry-pick xxx # 某次提交的ID
master:  A --- B --- C --- D
              \
feature:       E --- F --- G
                    ↑
                只想把这个提交拿到 master
master:  A --- B --- C --- D --- F'  ← F 被复制过来了
              \
feature:       E --- F --- G
```

只会挑选单个提交

## 远程仓库

远程仓库实际上就是位于服务器上的仓库，它能在远端保存版本历史，并且可以实现多人同时合作编写项目，每个人都能够同步他人的版本，能够看到他人的版本提交，相当于将代码放在服务器上进行托管。

远程仓库有公有和私有的，公有的远程仓库有`GitHub`、码云、`Coding`等，他们都是对外开放的，注册账号之后就可以使用远程仓库进行版本控制，其中最大的就是`GitHub`，私有的一般是`GitLab`这种自主搭建的远程仓库私服，在公司中比较常用，它只对公司内部开放，不对外开放

### 远程账户认证和推送

创建一个自定义的远程仓库

创建仓库后通过推送来将本地仓库中的内容推送到远程仓库。

```sh
# 自定义一个远程仓库名称，地址在github的对应仓库里有
git remote add 名称 远程仓库地址 
# 推送到远程仓库，相当于远程的commit
git push 远程仓库名称 本地分支名称
```

**https:**

`push`的时候需要身份验证，`GitHub`现在不允许使用用户名密码验证，只允许使用个人`AccessToken`来验证身份，所以需要去`Developer Setting`生成一个`Token`，勾选`user`

**SSH:**

每次都需要去输入token，SSH来实现一次性校验可以一劳永逸，在本地生成一个rsa公钥：

```sh
ssh-keygen -t rsa
cat ~/.ssh/github.pub
```

接着要在GitHub上传公钥，当再次去访问GitHub时会自动验证，就无需进行登录

### 克隆项目

已经存在一个远程仓库，需要在远程仓库的代码上继续编写代码

可以使用克隆操作来将远端仓库的内容全部复制到本地：
 （新文件夹不需要git init初始化）

```sh
git clone 远程仓库地址
```

这样本地就能够直接与远程保持同步

### 抓取、拉取和冲突解决

如果出现多个本地仓库对应一个远程仓库的情况下，也就是协同工作，那么这个时候就需要协调。

比如A完成了他的模块，那么他就可以提交代码并推送到远程仓库，这时B也要开始写代码了，由于远程仓库有其他程序员的提交记录，因此B的本地仓库和远程仓库不一致，这时就需要有先进行pull操作，获取远程仓库中最新的提交：

```sh
git fetch 远程仓库 #抓取：只获取但不合并远端分支，后面需要我们手动合并才能提交
git pull 远程仓库 #拉取：获取+合并
```

在B拉取了最新的版本后，再编写自己的代码然后提交就可以实现多人合作编写项目了，并且在拉取过程中就能将别人提交的内容同步到本地，开发效率大大提升

如果两次提交都修改了同一个文件，那么就会遇到和多分支合并一样的情况，在合并时会产生冲突，这时就需要我们自己去解决冲突
