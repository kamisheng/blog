---
title: Linux基础
date: 2026-04-14 14:39:20
tags: Linux
categories: 技术          # 分类
description: Linux操作基础知识  # 描述
cover: /images/Linux.jpg     # 封面图
---




---

### 虚拟终端（tty）

- Ctrl + Alt + F1 ~F6，前两个是图形化，后四个是纯文本
- 查看当前终端：tty
- 中断登录操作：Ctrl + C

### nano

- Alt + 6：复制
- Alt + A：设置标记
- Alt + U：撤销
- Alt + E：重做
- ^U：粘贴
- ^O：写入
- ^W：搜索
- ^\：替换
- ^x：退出
- ^-：跳行
- 
- Alt + Shift + 3：显示行号

### 系统总管理程序

- 传统：init 0 :关机
   init 6：重启
   init 3：纯命令行
   init 5：图形化界面
   runlevel：查看运行级别

- systemctl命令：

  ##### **系统控制**

  ```
  		重启系统
  		systemctl reboot
  		关机
  		systemctl poweroff
  		进入救援模式
  		systemctl rescue
  		进入紧急模式
  		systemctl emergency
  		挂起
  		systemctl suspend
  		休眠
  		systemctl hibernate
  		
  ```

  ### **切换运行级别**

  ```
  		切换到多用户模式（相当于级别3）
  		systemctl isolate multi-user.target
  		或
  		systemctl isolate runlevel3.target
  		
  		切换到图形界面模式（相当于级别5）
  		systemctl isolate graphical.target
  		或
  		systemctl isolate runlevel5.target
  		
  		切换到救援模式（相当于级别1）
  		systemctl isolate rescue.target
  		
  		切换到紧急模式（更基本的救援模式）
  		systemctl isolate emergency.target
  
  		设置默认启动到命令行模式
  		systemctl set-default multi-user.target
  		
  		设置默认启动到图形界面模式
  		systemctl set-default graphical.target
  		
  		查看当前默认
  		systemctl get-default
  ```

  ## 文件目录操作命令

### ls

- **作用**：显示指定目录下的内容
- **语法**：`ls [-al] [dir]`

说明

- `-a`：显示所有文件及目录（以`.`开头的隐藏文件也会列出）
- `-l`：除文件名外，还会列出文件的权限、拥有者、文件大小等详细信息

注意

由于经常使用 `ls -alt`，Linux 提供了 `ll` 作为 `ls -l` 的别名简写，`ll -a` 也可以替代 `ls -al`

### cd

- **作用**：切换当前工作目录
- **语法**：`cd [dirName]`

说明

- `~`：表示用户的 home 目录
- `.`：表示当前所在目录
- `..`：表示上级目录

### cat

- **作用**：显示文件全部内容
- **语法**：`cat [-n] fileName`

说明

- `-n`：从 1 开始对所有输出的行编号

举例

- `cat /etc/profile`
   查看 /etc 目录下的 profile 文件内容
- `cat -n /etc/profile`
   查看 /etc 目录下的 profile 文件内容，并显示行号

### more

- **作用**：以分页形式显示文件内容
- **语法**：`more fileName`

说明

- 回车：向下滚动一行
- 空格：向下滚动一屏
- `b`：返回上一屏
- `q` 或 Ctrl+C：退出

举例

- `more /etc/profile`
   以分页方式查看 /etc/profile 文件内容

### tail

- **作用**：查看文件末尾内容（常用于查看日志）
- **语法**：`tail [-f] [-n 行数] fileName`

说明

- 默认显示最后 10 行
- `-f`：动态跟踪文件最新内容（常用于监控日志）

举例

- `tail /etc/profile`
   显示文件末尾 10 行
- `tail -20 /etc/profile`
   显示文件末尾 20 行
- `tail -f /kyle/blog.log`
   实时监控 blog.log 文件新增内容

### mkdir

- **作用**：创建目录
- **语法**：`mkdir [-p] dirName`

说明

- `-p`：递归创建多层目录，如果父目录不存在则自动创建

举例

- `mkdir linuxCast`
   在当前目录创建 linuxCast 子目录
- `mkdir -p linuxCast/test`
   递归创建多层目录

### rmdir

- **作用**：删除空的目录
- **语法**：`rmdir [-p] dirName`

说明

- `-p`：删除子目录后如果父目录变为空，也一并删除
- 只能删除空目录

举例

- `rmdir linuxCast`
   删除名为 linuxCast 的空目录
- `rmdir -p linuxCast/test`
   删除 test 后如果 linuxCast 为空也一并删除

### rm

- **作用**：删除文件或目录
- **语法**：`rm [-rf] name`

说明

- `-r`：递归删除目录及内部所有内容
- `-f`：强制删除，不提示确认
- 支持通配符（如 `*`）

注意

`rm -rf /` 是极度危险的操作，请务必谨慎！

## 拷贝移动命令

### cp

- **作用**：复制文件或目录
- **语法**：`cp [-r] source dest`

说明

- `-r`：递归复制目录及其下所有内容

举例

- `cp hello.txt linuxCast/`
   复制 hello.txt 到 linuxCast 目录
- `cp hello.txt ./hi.txt`
   复制并改名为 hi.txt
- `cp -r linuxCast/* ./blog/`
   复制 linuxCast 目录下所有内容到 blog 目录

### mv

- **作用**：移动文件/目录 或 重命名
- **语法**：`mv source dest`

说明

- 如果 dest 不存在 → 重命名
- 如果 dest 存在且是目录 → 移动到该目录

举例

- `mv hello.txt hi.txt`
   重命名为 hi.txt
- `mv hi.txt blog/`
   移动到 blog 目录
- `mv linuxCast blog`
   如果 blog 不存在 → 重命名；如果存在 → 移动进去

## 打包压缩命令

### tar

- **作用**：打包、解包、压缩、解压
- **语法**：`tar [-zcvf|-zxvf] fileName [files]`

说明

- `.tar`：仅打包，未压缩
- `.tar.gz` / `.tgz`：打包并使用 gzip 压缩
- `-z`：使用 gzip 压缩/解压
- `-c`：创建新的包文件
- `-x`：从包文件中解包
- `-v`：显示详细过程
- `-f`：指定包文件名

举例

- `tar -cvf hello.tar ./*`
   将当前目录所有文件打包为 hello.tar（不压缩）
- `tar -czvf hello.tar.gz ./*`
   打包并压缩为 hello.tar.gz
- `tar -zxvf hello.tar.gz`
   解压并解包 hello.tar.gz

## 文本编辑命令

### vim

- **作用**：强大的文本编辑器（vi 的增强版）
- **语法**：`vim fileName`

说明

三种模式：

1. **命令模式**（默认进入）：可移动光标、复制粘贴、删除等
2. **插入模式**：按 `i`、`a`、`o` 进入，可编辑文字，左下角显示 `-- INSERT --`
3. **底行模式**：按 `:` 或 `/` 进入，可保存、退出、查找等
   - `:wq` 保存并退出
   - `:q!` 不保存强制退出
   - `:set nu` 显示行号

## 查找命令

### find

- **作用**：在指定目录下查找文件
- **语法**：`find dirName -name "pattern"`

举例

- `find / -name helloworld.log`
   在全系统查找 helloworld.log
- `find . -name "*.java"`
   在当前目录及其子目录查找所有 .java 文件

### grep

- **作用**：在文件中搜索包含指定文本的行
- **语法**：`grep word fileName`

举例

- `grep Hello Helloworld.java`
   在 Helloworld.java 中查找包含 Hello 的行
- `grep hello *.java`
   在当前目录所有 .java 文件中查找 hello

## WSL

- wsl --list -v：查看linux子系统列表
- wsl --install name：安装相应的发行版
- wsl --set-default name：设置默认发行版
- wsl --unregister name：卸载子系统
- wsl --export name 压缩包名字.tar：备份
- import 起个名字 文件夹 压缩包路径：将备份导入文件，变成hyperv的镜像文件
