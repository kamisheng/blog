---
title: JVM
date: 2026-04-14 14:59:52
updated: 2026-04-14 14:59:52
tags: JVM
categories: java
cover: images/JVM.jpg

---

# 概述

## JVM,JRE,JDK关系

- `JVM`就是运行.class文件的虚拟机
- `JRE`就是`JVM`加上**一些基本类库**
- `JDK`就是`JRE`加上**能把java代码编译成.class文件的开发工具**

## jvm启动流程：

- **启动 Java 命令**：启动JVM进程
- **加载 JVM 核心库**：加载自带的类，java.lang等
- 初始化运行环境([大致划分](#大致划分))：栈，堆，方法区，程序计数器 (代码编译成字节码后的行号指示器)
- **加载主类**：找到Main.class 验证准备解析，加载进方法区
- **执行主类**：找到main方法并执行
- **结束**：垃圾回收，JVM自销毁

## JNI  (Java调用C/C++的桥梁)

1. **为什么用JNI**？

- 操作底层硬件
- 复用已有的C++库，
- 提高计算密集型性能

1. **缺点**

- 跨平台性变差
- 内存不受GC管理，易泄露崩溃
- 调试麻烦

1. 基本流程
   - java声明 native 方法
   - 生成 .h
   - C实现
   - 编译成库
   - Java load 库
   - 调用

# JVM内存管理

## 内存区域划分

既然要管理内存，那么肯定不会是杂乱无章的，JVM对内存的管理采用的是分区治理，不同的内存区域有着各自的职责所在，在虚拟机运行时，内存区域如下划分：

![点击查看图片来源](https://oss.itbaima.cn/internal/markdown/2023/03/06/CP4yv1iqrfjmXzW.jpg)

内存区域一共分为5个区域，其中方法区和堆是所有线程共享的区域，随着虚拟机的创建而创建，虚拟机的结束而销毁，而虚拟机栈、本地方法栈、程序计数器都是线程之间相互隔离的，每个线程都有一个自己的区域，并且线程启动时会自动创建，结束之后会自动销毁。内存划分完成之后，JVM执行引擎和本地库接口，也就是Java程序开始运行之后就会根据分区合理地使用对应区域的内存了

### 大致划分

#### 程序计数器

它和传统8086 CPU中PC寄存器的工作差不多，因为JVM虚拟机目的就是实现物理机那样的程序执行。在8086 CPU中，PC作为程序计数器，负责储存内存地址，可以看作是**当前线程所执行的字节码的行号指示器**。

```java
// Java 代码
int sum = 0;
for (int i = 0; i < 10; i++) {
    sum += i;
}
```

**编译后的字节码**

```java
0: iconst_0        // PC = 0
1: istore_1        // PC = 1
2: iconst_0        // PC = 2
3: istore_2        // PC = 3
4: iload_2         // PC = 4
5: bipush 10       // PC = 5
7: if_icmpge 20    // PC = 7 (条件跳转)
10: iload_1        // PC = 10
11: iload_2        // PC = 11
12: iadd           // PC = 12
13: istore_1       // PC = 13
14: iinc 2, 1      // PC = 14
17: goto 4         // PC = 17 (跳转到 4)
20: return         // PC = 20
```

而JVM中的程序计数器可以看做是当前线程所执行字节码的行号指示器，而行号正好就指的是某一条指令，字节码解释器在工作时也会改变这个值，来指定下一条即将执行的指令。

因为Java的多线程也是依靠时间片轮转算法进行的，因此一个CPU同一时间也只会处理一个线程，当某个线程的时间片消耗完成后，会自动切换到下一个线程继续执行，而当前线程的执行位置会被保存到当前线程的程序计数器中，当下次轮转到此线程时，又继续根据之前的执行位置继续向下执行。

程序计数器因为只需要记录很少的信息，所以只占用很少一部分内存。

#### 虚拟机栈

虚拟机栈是一个栈结构，每个方法被执行的时候，Java虚拟机都会同步创建一个栈帧（其实就是栈里面的一个元素），栈帧中包括了当前方法的一些信息，比如局部变量表、操作数栈、动态链接、方法出口等。

![image-20230306164822720](https://oss.itbaima.cn/internal/markdown/2023/03/06/As1NGy6BwhKJ9kY.png)

1. **局部变量表**

存储方法参数和方法内部定义的局部变量

```java
public class LocalVariableTableDemo {
    
    public int calculate(int a, int b) {  // a和b是方法参数
        int c = 10;                        // c是局部变量
        String name = "张三";              // name是局部变量
        Object obj = new Object();         // obj是局部变量
        
        // 局部变量表结构（索引从0开始）
        // 0: this (实例方法，静态方法没有)
        // 1: a
        // 2: b
        // 3: c
        // 4: name
        // 5: obj
        
        return a + b + c;
    }
    
    public static void staticMethod(int x) {
        int y = 20;
        // 静态方法没有this
        // 局部变量表：
        // 0: x
        // 1: y
    }
}
```

存储方式

```java
public class VariableStorage {
    
    public void test() {
        // 基本类型：直接存储值
        int age = 25;           // 存储 25
        double salary = 10000;  // 存储 10000.0
        
        // 引用类型：存储对象的引用地址
        String str = "hello";   // 存储指向字符串对象的引用
        Object obj = new Object(); // 存储指向堆中对象的引用
        
        // 局部变量表大小在编译时确定
        // 使用 javap -c 查看字节码可以看到局部变量表大小
    }
}
```

1. **操作数栈**

用于存储计算过程中的中间结果，类似于一个临时存储区。

```java
public class OperandStackDemo {
    
    public int add(int a, int b) {
        int c = a + b;
        // 操作数栈的变化过程：
        // 1. 将 a 压栈
        // 2. 将 b 压栈
        // 3. 弹出 a 和 b，相加，结果压栈
        // 4. 弹出结果，存入局部变量表
        return c;
    }
    
    public int complexCalc() {
        int result = (10 + 20) * (30 - 15);
        // 复杂表达式的计算过程：
        // 1. 10 压栈
        // 2. 20 压栈
        // 3. 弹出10和20，相加得30，压栈
        // 4. 30 压栈
        // 5. 15 压栈
        // 6. 弹出30和15，相减得15，压栈
        // 7. 弹出30和15，相乘得450，压栈
        // 8. 弹出结果，存入局部变量表
        return result;
    }
}
```

**操作数栈的字节码演示**

```java
public class BytecodeDemo {
    
    public int calculate() {
        int a = 10;
        int b = 20;
        int c = a + b;
        return c;
    }
}
// 使用 javap -c 查看字节码
/*
public int calculate();
    Code:
       0: bipush        10      // 将10压入操作数栈
       2: istore_1              // 弹出10，存入局部变量1 (a)
       3: bipush        20      // 将20压入操作数栈
       5: istore_2              // 弹出20，存入局部变量2 (b)
       6: iload_1               // 将a压入操作数栈
       7: iload_2               // 将b压入操作数栈
       8: iadd                  // 弹出a和b，相加，结果压栈
       9: istore_3              // 弹出结果，存入局部变量3 (c)
      10: iload_3               // 将c压入操作数栈
      11: ireturn               // 返回栈顶元素
*/
```

1. **动态链接**

指向运行时常量池中该方法的引用，用于支持方法调用

```java
public class DynamicLinkingDemo {
    
    public void methodA() {
        methodB();  // 需要找到 methodB 的实际地址
        methodC();
    }
    
    public void methodB() { }
    public void methodC() { }
}
// 编译时：
// 只知道要调用 methodB，但不知道 methodB 的实际内存地址
// 运行时：
// 通过动态链接，找到 methodB 在运行时常量池中的符号引用
// 转换为直接引用（实际内存地址）

// 符号引用：编译时的引用，如方法名、字段名
// 直接引用：运行时的实际内存地址
```

1. **方法出口**

方法执行完后要返回到调用者的位置，这个位置就是方法出口。

```java
public class ReturnAddressDemo {
    
    public void caller() {
        int a = 10;           // 指令地址 0
        int b = 20;           // 指令地址 1
        int result = callee(); // 调用 callee，保存返回地址（指向下一条指令）
        System.out.println(result); // 指令地址 3（返回后从这里继续）
        int c = 30;           // 指令地址 4
    }
    
    public int callee() {
        int x = 100;          // 指令地址 0
        int y = 200;          // 指令地址 1
        return x + y;         // 指令地址 2，执行完后跳回调用者的返回地址
    }
}
```

#### 本地方法栈

与虚拟机栈作用差不多，但是它备用的

#### 堆

堆是整个Java应用程序共享的区域，也是整个虚拟机最大的一块内存空间，而此区域的职责就是存放和管理对象和数组，垃圾回收机制也是主要作用于这一部分内存区域

#### 方法区

方法区也是整个Java应用程序共享的区域，它用于存储所有的类信息、常量、静态变量、动态编译缓存等数据，可以大致分为两个部分，一个是类信息表，一个是运行时常量池。方法区也是我们要重点介绍的部分。

![image-20230306164925187](https://oss.itbaima.cn/internal/markdown/2023/03/06/vYL53rtIDAWcQhb.png)

首先类信息表中存放的是当前应用程序加载的所有类信息，包括类的版本、字段、方法、接口等信息，同时会将编译时生成的常量池数据全部存放到运行时常量池中。当然，常量也并不是只能从类信息中获取，在程序运行时，也有可能会有新的常量进入到常量池。

String类正是利用了常量池进行优化

```java
public static void main(String[] args) {
    String str1 = new String("abc");
    String str2 = new String("abc");

    System.out.println(str1 == str2);
    System.out.println(str1.equals(str2));
}
```

由于`str1`和`str2`是创建的两个对象，会在堆中存放，保存在不同的地址：

![image-20230306164934743](https://oss.itbaima.cn/internal/markdown/2023/03/06/tnqFSxzEcB4U9WL.png)

`==`判断，得到`false`，`equals`比较的是值，得到`true`

```java
public static void main(String[] args) {
    String str1 = "abc";
    String str2 = "abc";

    System.out.println(str1 == str2);
    System.out.println(str1.equals(str2));
}
```

使用双引号创建，结果变成两个`true`，因为直接使用双引号赋值，会先在常量池中查找是否存在相同的字符串，若存在，则将引用直接指向该字符串；若不存在，则在常量池中生成一个字符串，再将引用指向该字符串：

![image-20230306164942208](https://oss.itbaima.cn/internal/markdown/2023/03/06/GTgbpIYdCyK3RLj.png)

实际上两次调用String类的`intern()`方法，和上面的效果差不多，也是第一次调用会将堆中字符串复制并放入常量池中，第二次调用会查看常量池中是否包含，如果包含那么会直接返回常量池中字符串的地址：

```java
public static void main(String[] args) {
    //不能直接写"abc"，双引号的形式，写了就直接在常量池里面吧abc创好了
    String str1 = new String("ab")+new String("c");
    String str2 = new String("ab")+new String("c");

    System.out.println(str1.intern() == str2.intern());
    System.out.println(str1.equals(str2));
}
```

![image-20230306164954716](https://oss.itbaima.cn/internal/markdown/2023/03/06/EOC5ilkr396BHNy.png)

所以上述结果中得到的依然是两个`true`。JDK1.7之后，稍微有一些区别，在调用`intern()`方法时，当常量池中没有对应的字符串时，不会再进行复制操作，而是将其直接修改为指向当前字符串堆中的的引用：

![image-20230306165005169](https://oss.itbaima.cn/internal/markdown/2023/03/06/2fXENphit4OZvVk.png)

```java
public static void main(String[] args) {
  	//不能直接写"abc"，双引号的形式，写了就直接在常量池里面吧abc创好了
    String str1 = new String("ab")+new String("c");
    System.out.println(str1.intern() == str1);
}
public static void main(String[] args) {
    String str1 = new String("ab")+new String("c");
    String str2 = new String("ab")+new String("c");

    System.out.println(str1 == str1.intern());
    System.out.println(str2.intern() == str1);
}
```

发现`str1.intern()`和`str1`都是同一个对象，结果为`true`。

*JDK7之后，字符串常量池从方法区移动到了堆中。*

总结用途：

- （线程独有）程序计数器：保存当前程序的执行位置。
- （线程独有）虚拟机栈：通过栈帧来维持方法调用顺序，帮助控制程序有序运行。
- （线程独有）本地方法栈：同上，作用与本地方法。
- 堆：所有的对象和数组都在这里保存。
- 方法区：类信息、即时编译器的代码缓存、运行时常量池

### 爆内存和爆栈

- `OutOfMemoryError`错误，也就是内存溢出错误
- `Java heap space`错误，也就是堆内存溢出

### 申请堆外内存

申请堆外内存（直接内存），也就是不受JVM管控的内存区域，这部分区域的内存需要自行去申请和释放，实际上本质就是JVM通过C/C++调用`malloc`函数申请的内存，当然得自己去释放。不过依然会受到本机最大内存的限制，所以还是有可能抛出`OutOfMemoryError`异常。

堆外内存操作类：`Unsafe`，虽然Java提供堆外内存的操作类，但是实际上它是不安全的，只有完全了解底层原理并且能够合理控制堆外内存，才能安全地使用堆外内存。

这个类不让new，也没有直接获取方式（压根就没想让用）：

```java
public final class Unsafe {

    private static native void registerNatives();
    static {
        registerNatives();
        sun.reflect.Reflection.registerMethodsToFilter(Unsafe.class, "getUnsafe");
    }

    private Unsafe() {}

    private static final Unsafe theUnsafe = new Unsafe();
  
    @CallerSensitive
    public static Unsafe getUnsafe() {
        Class<?> caller = Reflection.getCallerClass();
        if (!VM.isSystemDomainLoader(caller.getClassLoader()))
            throw new SecurityException("Unsafe");   //不是JDK的类，不让用。
        return theUnsafe;
    }
```

这里就通过反射给他giao出来：

```java
public static void main(String[] args) throws IllegalAccessException {
    Field unsafeField = Unsafe.class.getDeclaredFields()[0];
    unsafeField.setAccessible(true);
    Unsafe unsafe = (Unsafe) unsafeField.get(null);
    
}
```

成功拿到Unsafe类之后，可以开始申请堆外内存了，现在申请一个int大小的内存空间，并在此空间中存放一个int类型的数据：

```java
public static void main(String[] args) throws IllegalAccessException {
    Field unsafeField = Unsafe.class.getDeclaredFields()[0];
    unsafeField.setAccessible(true);
    Unsafe unsafe = (Unsafe) unsafeField.get(null);

    //申请4字节大小的内存空间，并得到对应位置的地址
    long address = unsafe.allocateMemory(4);
    //在对应的地址上设定int的值
    unsafe.putInt(address, 6666666);
    //获取对应地址上的Int型数值
    System.out.println(unsafe.getInt(address));
    //释放申请到的内容
    unsafe.freeMemory(address);

    //由于内存已经释放，这时数据就没了
    System.out.println(unsafe.getInt(address));
}
```

`allocateMemory`底层调用，这是一个native方法，C++源码：

```cpp
UNSAFE_ENTRY(jlong, Unsafe_AllocateMemory0(JNIEnv *env, jobject unsafe, jlong size)) {
  size_t sz = (size_t)size;

  sz = align_up(sz, HeapWordSize);
  void* x = os::malloc(sz, mtOther);   //这里调用了os::malloc方法

  return addr_to_java(x);
} UNSAFE_END
```

接着来看：

```cpp
void* os::malloc(size_t size, MEMFLAGS flags) {
  return os::malloc(size, flags, CALLER_PC);
}

void* os::malloc(size_t size, MEMFLAGS memflags, const NativeCallStack& stack) {
	...
  u_char* ptr;
  ptr = (u_char*)::malloc(alloc_size);   //调用C++标准库函数 malloc(size)
	....
  // we do not track guard memory
  return MemTracker::record_malloc((address)ptr, size, memflags, stack, level);
}
```

Java代码转换为C代码，差不多就是这个意思：

```c
#include <stdlib.h>
#include <stdio.h>

int main(){
    int * a = malloc(sizeof(int));
    *a = 6666666;
    printf("%d\n", *a);
    free(a);
    printf("%d\n", *a);
}
```

直接内存实际上就是JVM申请的一块额外的内存空间，但是它并不在受管控的几种内存空间中，当然这些内存依然属于是JVM，由于JVM提供的堆内存会进行垃圾回收等工作，效率不如直接申请和操作内存来得快，一些比较追求极致性能的框架会用到堆外内存来提升运行速度，如nio框架

## 垃圾回收机制

Java会自动管理和释放内存，不像C/C++那样要求手动管理内存，JVM提供了一套全自动的内存管理机制，当一个Java对象不再用到时，JVM会自动将其进行回收并释放内存

### 对象存活判定算法

以下几种垃圾回收算法

![image-20230306165128192](https://oss.itbaima.cn/internal/markdown/2023/03/06/stqTu8gD3ykixva.png)

#### 引用计数法

如果要经常操作一个对象，那么首先一定会创建一个引用变量：

```java
//str就是一个引用类型的变量，它持有对后面字符串对象的引用，可以代表后面这个字符串对象本身
String str = "lbwnb";

//str.xxxxx...
```

只要一个对象还有使用价值，就会通过它的引用变量来进行操作，那么可判断一个对象是否还需要被使用：

- 每个对象都包含一个 **引用计数器**，用于存放引用计数（其实就是存放被引用的次数）
- 每当有一个地方引用此对象时，引用计数`+1`
- 当引用失效（ 比如离开了局部变量的作用域或是引用被设定为`null`）时，引用计数`-1`
- 当引用计数为`0`时，表示此对象不可能再被使用，因为这时我们已经没有任何方法可以得到此对象的引用了

如果两个对象相互引用: 

```java
public class Main {
    public static void main(String[] args) {
        Test a = new Test();
        Test b = new Test();

        a.another = b;
        b.another = a;

        //这里直接把a和b赋值为null，这样前面的两个对象我们不可能再得到了
        a = b = null;
    }

    private static class Test{
        Test another;
    }
}
```

这两个对象直接存在相互引用，引用计数器的值将会永远是`1`，但是实际上此对象已经没有任何用途了。所以引用计数法并不是最好的解决方案。

#### 可达性分析算法

目前比较主流的编程语言（包括Java），一般都会使用可达性分析算法来判断对象是否存活，采用了类似于树结构的搜索机制。

首先每个对象的引用都有机会成为树的根节点（GC Roots），可以被选定作为根节点条件如下：

- 位于虚拟机栈的栈帧中的本地变量表中所引用到的对象（其实就是我们方法中的局部变量）同样也包括本地方法栈中JNI引用的对象。
- 类的静态成员变量引用的对象。
- 方法区中，常量池里面引用的对象，比如我们之前提到的`String`类型对象。
- 被添加了锁的对象（比如synchronized关键字）
- 虚拟机内部需要用到的对象。

![image-20230306165140204](https://oss.itbaima.cn/internal/markdown/2023/03/06/4MIORcEDzquZFia.png)

一旦已经存在的根节点不满足存在的条件时，那么根节点与对象之间的连接将被断开。此时虽然对象1仍存在对其他对象的引用，但是由于其没有任何根节点引用，所以此对象即可被判定为不再使用。比如某个方法中的局部变量引用，在方法执行完成返回之后：

![image-20230306165153841](https://oss.itbaima.cn/internal/markdown/2023/03/06/WYSGI5xCh8mOBcK.png)

这样就能很好地解决循环引用问题：

![image-20230306165211604](https://oss.itbaima.cn/internal/markdown/2023/03/06/48ZguJqIK6ojEba.png)

可以看到，对象1和对象2依然是存在循环引用的，但是只有他们各自的GC Roots断开，那么就会变成下面这样：

![image-20230306165225991](https://oss.itbaima.cn/internal/markdown/2023/03/06/KdZpLNTzEitCOB3.png)

如果某个对象无法到达任何GC Roots，则证明此对象是不可能再被使用的

#### 最终判定

虽然在经历了可达性分析算法之后基本可能判定哪些对象能够被回收，但是并不代表此对象一定会被回收，我们依然可以在最终判定阶段对其进行挽留。

`Object`类的`finalize()`方法

```java
/**
 * Called by the garbage collector on an object when garbage collection
 * determines that there are no more references to the object.
 * A subclass overrides the {@code finalize} method to dispose of
 * system resources or to perform other cleanup.
 * ...
 */
protected void finalize() throws Throwable { }
```

此方法正是最终判定方法，如果子类重写了此方法，那么子类对象在被判定为可回收时，会进行二次确认，也就是执行`finalize()`方法，而在此方法中，当前对象是完全有可能重新建立GC Roots的！所以，如果在二次确认后对象不满足可回收的条件，那么此对象不会被回收，巧妙地逃过了垃圾回收的命运。比如下面这个例子：

```java
public class Main {
    private static Test a;
    public static void main(String[] args) throws InterruptedException {
        a = new Test();

        //这里直接把a赋值为null，这样前面的对象我们不可能再得到了
        a  = null;

        //手动申请执行垃圾回收操作（注意只是申请，并不一定会执行，但是一般情况下都会执行）
        System.gc();

        //等垃圾回收一下()
        Thread.sleep(1000);

        //我们来看看a有没有被回收
        System.out.println(a);
    }

    private static class Test{
        @Override
        protected void finalize() throws Throwable {
            System.out.println(this+" 开始了它的救赎之路！");
            a = this;
        }
    }
}
```

`finalize()`方法并不是在主线程调用的，而是虚拟机自动建立的一个低优先级的`Finalizer`线程（正是因为优先级比较低，所以前面才需要等待1秒钟）进行处理，修改一下看看：

```java
private static class Test{
    @Override
    protected void finalize() throws Throwable {
        System.out.println(Thread.currentThread());
        a = this;
    }
}
Thread[Finalizer,8,system]
com.test.Main$Test@232204a1
```

同一个对象的`finalize()`方法只会有一次调用机会，如果连续两次操作，第二次对象必被回收：

```java
public static void main(String[] args) throws InterruptedException {
    a = new Test();
    //这里直接把a赋值为null，这样前面的对象我们不可能再得到了
    a  = null;
    //手动申请执行垃圾回收操作（注意只是申请，并不一定会执行，但是一般情况下都会执行）
    System.gc();
    //等垃圾回收一下
    Thread.sleep(1000);
    
    System.out.println(a);
    //这里直接把a赋值为null，这样前面的对象我们不可能再得到了
    a  = null;
    //手动申请执行垃圾回收操作（注意只是申请，并不一定会执行，但是一般情况下都会执行）
    System.gc();
    //等垃圾回收一下
    Thread.sleep(1000);
    
    System.out.println(a);
}
```

`finalize()`方法也并不是专门防止对象被回收的, 可以使用它来释放一些程序使用中的资源等

最后，总结成一张图：

![image-20230306165250173](https://oss.itbaima.cn/internal/markdown/2023/03/06/8sSvloxtKINFYz4.png)

除了堆中的对象以外，方法区中的数据也是可以被垃圾回收的，但是回收条件比较严格

### 垃圾回收算法

现在可以知道堆中的哪些对象可以被回收，接下来该考虑如何对对象进行回收，垃圾收集器会不定期地检查堆中的对象，查看它们是否满足被回收的条件

#### 分代收集机制

实际上，如果对堆中的每一个对象都依次判断是否需要回收，这样的效率其实是很低，第一步可以对堆中的对象进行分代管理。

Java虚拟机将堆内存划分为**新生代**、**老年代**（其中永久代在堆外内存，是HotSpot虚拟机特有的概念，在JDK8之前方法区实际上就是采用的永久代作为实现，而在JDK8之后，方法区由元空间实现，并且使用的是本地内存，容量大小取决于物理机实际大小）这里主要讨论的是**新生代**和**老年代**。

不同的分代内存回收机制也存在一些不同之处，在HotSpot虚拟机中，新生代被划分为三块，一块较大的Eden空间和两块较小的Survivor空间，默认比例为8：1：1，老年代的GC评率相对较低

永久代不在堆内存中！！此图有错！=

![image-20230306165311823](https://oss.itbaima.cn/internal/markdown/2023/03/06/OZrKbUm39lfaAgv.png)

首先所有新创建的对象，在一开始都会进入到新生代的Eden区（如果是大对象会被直接丢进老年代），在进行新生代区域的垃圾回收时，首先会对所有新生代区域的对象进行扫描，并回收那些不再使用的对象：

![image-20230306165326642](https://oss.itbaima.cn/internal/markdown/2023/03/06/lENKm3CMuxk1JFI.png)

接着在一次垃圾回收之后，Eden区域没有被回收的对象，会进入到Survivor区。在一开始From和To都是空的，而GC之后，所有Eden区域存活的对象都会直接被放入到From区，最后From和To会发生一次交换，也就是说目前存放对象的From区，变为To区，而To区变为From区：

![image-20230306165336145](https://oss.itbaima.cn/internal/markdown/2023/03/06/xU6LY3nDukNg2rv.png)

接着就是下一次垃圾回收，操作相同，不过这时由于我们From区域中已经存在对象，所以在Eden区的存活对象复制到From区之后，所有To区域中的对象会进行年龄判定（每经历一轮GC年龄`+1`，如果对象的年龄大于`默认值为15`，那么会直接进入到老年代，否则移动到From区）

![image-20230306165345563](https://oss.itbaima.cn/internal/markdown/2023/03/06/NeGcYPwDOkdjVfq.png)

最后像上面一样交换To区和From区，之后不断重复以上步骤

而垃圾收集也分为：

- Minor GC - 次要垃圾回收，主要进行新生代区域的垃圾收集。
  - 触发条件：新生代的Eden区容量已满时。
- Major GC - 主要垃圾回收，主要进行老年代的垃圾收集。
- Full GC - 完全垃圾回收，对整个Java堆内存和方法区进行垃圾回收。
  - 触发条件1：每次晋升到老年代的对象平均大小大于老年代剩余空间
  - 触发条件2：Minor GC后存活的对象超过了老年代剩余空间
  - 触发条件3：永久代内存不足（JDK8之前）
  - 触发条件4：手动调用`System.gc()`方法

可以添加启动参数来查看JVM的GC日志：

![image-20230306165355706](https://oss.itbaima.cn/internal/markdown/2023/03/06/iWqvCUySGk8Qlad.png)

```java
public class Main {
    public static void main(String[] args) {
        Object o = new Object();
        o = null;
        System.gc();
    }
}
```

-->

```
[GC (System.gc()) [PSYoungGen: 2621K->528K(76288K)] 2621K->528K(251392K), 0.0006874 secs] [Times: user=0.01 sys=0.01, real=0.00 secs] 
[Full GC (System.gc()) [PSYoungGen: 528K->0K(76288K)] [ParOldGen: 0K->332K(175104K)] 528K->332K(251392K), [Metaspace: 3073K->3073K(1056768K)], 0.0022693 secs] [Times: user=0.00 sys=0.00, real=0.00 secs] 
Heap
 PSYoungGen      total 76288K, used 3277K [0x000000076ab00000, 0x0000000770000000, 0x00000007c0000000)
  eden space 65536K, 5% used [0x000000076ab00000,0x000000076ae334d8,0x000000076eb00000)
  from space 10752K, 0% used [0x000000076eb00000,0x000000076eb00000,0x000000076f580000)
  to   space 10752K, 0% used [0x000000076f580000,0x000000076f580000,0x0000000770000000)
 ParOldGen       total 175104K, used 332K [0x00000006c0000000, 0x00000006cab00000, 0x000000076ab00000)
  object space 175104K, 0% used [0x00000006c0000000,0x00000006c00532d8,0x00000006cab00000)
 Metaspace       used 3096K, capacity 4496K, committed 4864K, reserved 1056768K
  class space    used 333K, capacity 388K, committed 512K, reserved 1048576K
```

#### 空间分配担保

有一种极端情况（正常情况下新生代的回收率是很高的，所以说不用太担心会经常出现这种问题），在一次GC后，新生代Eden区仍然存在大量的对象（因为GC之后存活对象会进入到一个Survivor区，但是很明显这时已经超出Survivor区的容量了，肯定是装不下的）

这时就需要用到空间分配担保机制，可以把Survivor区无法容纳的对象直接送到老年代，让老年代进行分配担保（当然老年代也得装得下)

当新生代无法容纳更多的的对象时，可以把新生代中的对象移动到老年代中，这样新生代就腾出了空间来容纳更多的对象

要是老年代也装不下新生代的数据，首先会判断一下之前的每次垃圾回收进入老年代的平均大小是否小于当前老年代的剩余空间，如果小于，那么说明也许可以放得下（不过也仅仅是也许，依然有可能放不下，因为判断的实际上只是平均值，万一这一次突然非常大），否则，会先来一次Full GC，进行一次大规模垃圾回收，来尝试腾出空间，再次判断老年代是否有空间存放，要是还是装不下，直接抛出OOM错误，摆烂

Minor GC的整个过程：
 71PqlEfiGgBSLae.webp

#### 标记-清除算法

具体的回收过程又是什么样，首先了解一下最古老的`标记-清除`算法

首先标记出所有需要回收的对象，然后再依次回收掉被标记的对象，或是标记出所有不需要回收的对象，只回收未标记的对象。实际上这种算法是非常基础的，并且最易于理解的（这里方框实际上存放是GC Roots形式）

![image-20230306165444019](https://oss.itbaima.cn/internal/markdown/2023/03/06/d8anmBcLrW3iyJl.png)

缺点也是非常明显 ，首先如果内存中存在大量的对象，那么可能就会存在大量的标记，并且大规模进行清除。并且一次标记清除之后，连续的内存空间可能会出现空隙，碎片化会导致连续内存空间利用率降低。

#### 标记-复制算法

标记复制算法，实际上就是将内存区域划分为大小相同的两块区域，每次只使用其中的一块区域，每次垃圾回收结束后，将所有存活的对象全部复制到另一块区域中，并一次性清空当前区域。虽然浪费了一些时间进行复制操作，但是这样能够很好地解决对象大面积回收后空间碎片化严重的问题。

![image-20230306165458671](https://oss.itbaima.cn/internal/markdown/2023/03/06/JeifGj6kmVAY2PR.png)

这种算法就非常适用于新生代（因为新生代的回收效率极高，一般不会留下太多的对象）的垃圾回收，而新生代Survivor区其实就是这个思路，包括8:1:1的比例也正是为了对标记复制算法进行优化而采取的。

#### 标记-整理算法

虽然标记-复制算法能够很好地应对新生代高回收率的场景，但是放到老年代，它就显得很鸡肋。一般长期都回收不到的对象才有机会进入到老年代，所以老年代可能一次GC后，仍然存留很多对象。而标记复制算法会在GC后完整复制整个区域内容，并且会折损50%的区域，显然这并不适用于老年代。

在标记所有待回收对象之后，将所有待回收的对象整齐排列在一段内存空间中，而需要回收的对象全部往后丢，这样，前半部分的所有对象都是无需进行回收的，而后半部分直接一次性清除即可。

![image-20230306165514101](https://oss.itbaima.cn/internal/markdown/2023/03/06/4UncSVvO1P2xWKL.png)

虽然这样能保证内存空间充分使用，并且也没有标记复制算法那么繁杂，但是效率比前两者都低。甚至由于需要修改对象在内存中的位置，此时程序必须要暂停才可以，在极端情况下，可能会导致整个程序发生停顿（被称为“Stop The World”）

所以可以将标记清除算法和标记整理算法混合使用，在内存空间还不是很凌乱的时候，采用标记清除算法其实没多大问题，当内存空间凌乱到一定程度后，进行一次标记整理算法

### 垃圾收集器实现

### 垃圾收集器实现

#### Serial收集器

这款垃圾收集器也是元老级别的收集器了，在JDK1.3.1之前，是虚拟机新生代区域收集器的唯一选择。这是一款单线程的垃圾收集器，当开始进行垃圾回收时，需要暂停所有的线程，直到垃圾收集工作结束。它的新生代收集算法采用的是标记复制算法，老年代采用的是标记整理算法。

![image-20230306165527009](https://oss.itbaima.cn/internal/markdown/2023/03/06/v79TEdmyo1njKwl.png)

当进入到垃圾回收阶段时，所有的用户线程必须等待GC线程完成工作

优势显而易见：

1. 设计简单而高效。
2. 在用户的桌面应用场景中，内存一般不大，可以在较短时间内完成垃圾收集，只要不频繁发生，使用串行回收器是可以接受的。

所以，在客户端模式（一般用于一些桌面级图形化界面应用程序）下的新生代中，默认垃圾收集器至今依然是Serial收集器。

#### ParNew收集器

相当于是Serial收集器的多线程版本，它能够支持多线程垃圾收集：

![image-20230306165542516](https://oss.itbaima.cn/internal/markdown/2023/03/06/tQwzAK1XU5gdl8Y.png)

除了多线程支持以外，其他内容基本与Serial收集器一致，并且目前某些JVM默认的服务端模式新生代收集器就是使用的ParNew收集器。

#### Parallel Scavenge/Parallel Old收集器

Parallel Scavenge同样是一款面向新生代的垃圾收集器，同样采用标记复制算法实现，在JDK6时也推出了其老年代收集器Parallel Old，采用标记整理算法实现：

![image-20230306165555265](https://oss.itbaima.cn/internal/markdown/2023/03/06/npiZY1Q4e5EhGuB.png)

与ParNew收集器不同的是，它会自动衡量一个吞吐量，并根据吞吐量来决定每次垃圾回收的时间，这种自适应机制，能够很好地权衡当前机器的性能，根据性能选择最优方案。

目前JDK8采用的就是这种 Parallel Scavenge + Parallel Old 的垃圾回收方案。

#### CMS收集器

在JDK1.5，HotSpot推出了一款在强交互应用中几乎可认为有划时代意义的垃圾收集器：CMS（Concurrent-Mark-Sweep）收集器，这款收集器是HotSpot虚拟机中第一款真正意义上的并发（注意这里的并发和之前的并行是有区别的，并发可以理解为同时运行用户线程和GC线程，而并行可以理解为多条GC线程同时工作）收集器，它第一次实现了让垃圾收集线程与用户线程同时工作。

它主要采用标记清除算法：

![image-20230306165610810](https://oss.itbaima.cn/internal/markdown/2023/03/06/qhmndIQPKarvDso.png)

它的垃圾回收分为4个阶段：

- 初始标记（需要暂停用户线程）：这个阶段的主要任务仅仅只是标记出GC Roots能直接关联到的对象，速度比较快，不用担心会停顿太长时间。
- 并发标记：从GC Roots的直接关联对象开始遍历整个对象图的过程，这个过程耗时较长但是不需要停顿用户线程，可以与垃圾收集线程一起并发运行。
- 重新标记（需要暂停用户线程）：由于并发标记阶段可能某些用户线程会导致标记产生变得，因此这里需要再次暂停所有线程进行并行标记，这个时间会比初始标记时间长一丢丢。
- 并发清除：最后就可以直接将所有标记好的无用对象进行删除，因为这些对象程序中也用不到了，所以可以与用户线程并发运行。

缺点显而易见，标记清除算法会产生大量的内存碎片，导致可用连续空间逐渐变少，长期这样下来，会有更高的概率触发Full GC，并且在与用户线程并发执行的情况下，也会占用一部分的系统资源，导致用户线程的运行速度一定程度上减慢。

如果希望的是最低的GC停顿时间，这款垃圾收集器无疑是最佳选择，自从G1收集器问世之后，CMS收集器不再推荐使用了

#### Garbage First (G1) 收集器

此垃圾收集器也是一款划时代的垃圾收集器，在JDK7的时候正式走上历史舞台，它是一款主要面向于服务端的垃圾收集器，并且在JDK9时，取代了JDK8默认的 Parallel Scavenge + Parallel Old 的回收方案。

垃圾回收分为`Minor GC`、`Major GC` 和`Full GC`，它们分别对应的是新生代，老年代和整个堆内存的垃圾回收，而G1收集器巧妙地绕过了这些约定，它将整个Java堆划分成`2048`个大小相同的独立`Region`块，每个`Region块`的大小根据堆空间的实际大小而定，整体被控制在1MB到32MB之间，且都为2的N次幂。所有的`Region`大小相同，且在JVM的整个生命周期内不会发生改变。

每一个`Region`都可以根据需要，自由决定扮演哪个角色（Eden、Survivor和老年代），收集器会根据对应的角色采用不同的回收策略。此外，G1收集器还存在一个Humongous区域，它专门用于存放大对象（一般认为大小超过了Region容量一半的对象为大对象）这样，新生代、老年代在物理上，不再是一个连续的内存区域，而是到处分布的。

![image-20230306165629129](https://oss.itbaima.cn/internal/markdown/2023/03/06/yHxXZP92DKc5Qre.png)

它的回收过程与CMS大体类似：

![image-20230306165641872](https://oss.itbaima.cn/internal/markdown/2023/03/06/kXRMlt5iFDvjq8y.png)

分为以下四个步骤：

- 初始标记（暂停用户线程）：仅仅只是标记一下GC Roots能直接关联到的对象，并且修改TAMS指针的值，让下一阶段用户线程并发运行时，能正确地在可用的Region中分配新对象。这个阶段需要停顿线程，但耗时很短，而且是借用进行Minor GC的时候同步完成的，所以G1收集器在这个阶段实际并没有额外的停顿。
- 并发标记：从GC Root开始对堆中对象进行可达性分析，递归扫描整个堆里的对象图，找出要回收的对象，这阶段耗时较长，但可与用户程序并发执行。
- 最终标记（暂停用户线程）：对用户线程做一个短暂的暂停，用于处理并发标记阶段漏标的那部分对象。
- 筛选回收：负责更新Region的统计数据，对各个Region的回收价值和成本进行排序，根据用户所期望的停顿时间来制定回收计划，可以自由选择任意多个Region构成回收集，然后把决定回收的那一部分Region的存活对象复制到空的Region中，再清理掉整个旧Region的全部空间。这里的操作涉及存活对象的移动，是必须暂停用户线程，由多个收集器线程并行完成的。

### 元空间

JDK8之前，Hotspot虚拟机的方法区实际上是永久代实现的。在JDK8之后，Hotspot虚拟机不再使用永久代，而是采用了全新的元空间。类的元信息被存储在元空间中。元空间没有使用堆内存，而是与堆不相连的本地内存区域。所以，理论上系统可以使用的内存有多大，元空间就有多大，所以不会出现永久代存在时的内存溢出问题。这项改造也是有必要的，永久代的调优是很困难的，虽然可以设置永久代的大小，但是很难确定一个合适的大小，因为其中的影响因素很多，比如类数量的多少、常量数量的多少等。

![image-20230306165703340](https://oss.itbaima.cn/internal/markdown/2023/03/06/2RD3AnPvbh1lQ5N.png)

因此在JDK8时直接将本地内存作为元空间（**Metaspace**）的区域，物理内存有多大，元空间内存就可以有多大，这样永久代的空间分配问题就讲解了，所以最终它变成了这样：

![image-20230306165714662](https://oss.itbaima.cn/internal/markdown/2023/03/06/iVcYMU9jdn2NC6Z.png)

------

### 其他引用类型

如果变量是一个对象类型的，那么它实际上存放的是对象的引用，但是如果是一个基本类型，那么存放的就是基本类型的值。`Object o = new Object()`可以称为`强引用`。

强引用断开条件：

1. 此方法运行结束
2. 引用连接断开

当JVM内存空间不足时，JVM宁愿抛出OutOfMemoryError使程序异常终止，也不会靠随意回收具有强引用的“存活”对象来解决内存不足的问题。

#### 软引用

当 JVM 认为内存不足时，会去回收软引用指向的对象，即JVM 会确保在抛出 OutOfMemoryError 之前，清理软引用指向的对象

创建一个软引用：

```java
public class Main {
    public static void main(String[] args) {
        //强引用写法：Object obj = new Object();
        //软引用写法：
        SoftReference<Object> reference = new SoftReference<>(new Object());
        //使用get方法就可以获取到软引用所指向的对象了
        System.out.println(reference.get());
    }
}
```

软引用还存在一个带队列的构造方法，软引用可以和一个引用队列（ReferenceQueue）联合使用，如果软引用所引用的对象被垃圾回收器回收，Java虚拟机就会把这个软引用加入到与之关联的引用队列中。

设定一下最大堆内存为10M并且打印GC日志的参数：

```
-XX:+PrintGCDetails -Xms10M -Xmx10M
```

接着运行以下代码：

```java
public class Main {
    public static void main(String[] args) {
        ReferenceQueue<Object> queue = new ReferenceQueue<>();
        SoftReference<Object> reference = new SoftReference<>(new Object(), queue);
        System.out.println(reference);

        try{
            List<String> list = new ArrayList<>();
            while (true) list.add(new String("lbwnb"));
        }catch (Throwable t){
            System.out.println("发生了内存溢出！"+t.getMessage());
            System.out.println("软引用对象："+reference.get());
            System.out.println(queue.poll());
        }
    }
}
```

运行结果如下：

```
java.lang.ref.SoftReference@232204a1
[GC (Allocation Failure) [PSYoungGen: 3943K->501K(4608K)] 3943K->2362K(15872K), 0.0050615 secs] [Times: user=0.01 sys=0.00, real=0.01 secs] 
[GC (Allocation Failure) [PSYoungGen: 3714K->496K(4608K)] 5574K->4829K(15872K), 0.0049642 secs] [Times: user=0.03 sys=0.00, real=0.01 secs] 
[GC (Allocation Failure) [PSYoungGen: 3318K->512K(4608K)] 7652K->7711K(15872K), 0.0059440 secs] [Times: user=0.03 sys=0.00, real=0.00 secs] 
[GC (Allocation Failure) --[PSYoungGen: 4608K->4608K(4608K)] 11807K->15870K(15872K), 0.0078912 secs] [Times: user=0.05 sys=0.00, real=0.01 secs] 
[Full GC (Ergonomics) [PSYoungGen: 4608K->0K(4608K)] [ParOldGen: 11262K->10104K(11264K)] 15870K->10104K(15872K), [Metaspace: 3207K->3207K(1056768K)], 0.0587856 secs] [Times: user=0.24 sys=0.00, real=0.06 secs] 
[Full GC (Ergonomics) [PSYoungGen: 4096K->1535K(4608K)] [ParOldGen: 10104K->11242K(11264K)] 14200K->12777K(15872K), [Metaspace: 3207K->3207K(1056768K)], 0.0608198 secs] [Times: user=0.25 sys=0.01, real=0.06 secs] 
[Full GC (Ergonomics) [PSYoungGen: 3965K->3896K(4608K)] [ParOldGen: 11242K->11242K(11264K)] 15207K->15138K(15872K), [Metaspace: 3207K->3207K(1056768K)], 0.0972088 secs] [Times: user=0.58 sys=0.00, real=0.10 secs] 
[Full GC (Allocation Failure) [PSYoungGen: 3896K->3896K(4608K)] [ParOldGen: 11242K->11225K(11264K)] 15138K->15121K(15872K), [Metaspace: 3207K->3207K(1056768K)], 0.1028222 secs] [Times: user=0.63 sys=0.01, real=0.10 secs] 
发生了内存溢出！Java heap space
软引用对象：null
java.lang.ref.SoftReference@232204a1
Heap
 PSYoungGen      total 4608K, used 4048K [0x00000007bfb00000, 0x00000007c0000000, 0x00000007c0000000)
  eden space 4096K, 98% used [0x00000007bfb00000,0x00000007bfef40a8,0x00000007bff00000)
  from space 512K, 0% used [0x00000007bff00000,0x00000007bff00000,0x00000007bff80000)
  to   space 512K, 0% used [0x00000007bff80000,0x00000007bff80000,0x00000007c0000000)
 ParOldGen       total 11264K, used 11225K [0x00000007bf000000, 0x00000007bfb00000, 0x00000007bfb00000)
  object space 11264K, 99% used [0x00000007bf000000,0x00000007bfaf64a8,0x00000007bfb00000)
 Metaspace       used 3216K, capacity 4500K, committed 4864K, reserved 1056768K
  class space    used 352K, capacity 388K, committed 512K, reserved 1048576K
```

内存不足时，软引用所指向的对象被回收了，所以`get()`方法得到的结果为null，并且软引用对象本身被丢进了队列中

#### 弱引用

弱引用比软引用的生命周期还要短，在进行垃圾回收时，不管当前内存空间是否充足，都会回收它的内存

创建一个弱引用：

```java
public class Main {
    public static void main(String[] args) {
        WeakReference<Object> reference = new WeakReference<>(new Object());
        System.out.println(reference.get());
    }
}
```

手动GC：

```java
public class Main {
    public static void main(String[] args) {
        SoftReference<Object> softReference = new SoftReference<>(new Object());
        WeakReference<Object> weakReference = new WeakReference<>(new Object());

        //手动GC
        System.gc();

        System.out.println("软引用对象："+softReference.get());
        System.out.println("弱引用对象："+weakReference.get());
    }
}
```

弱引用对象被回收，软引用对象没有被回收。它同样支持ReferenceQueue

`WeakHashMap`正是一种类似于弱引用的HashMap类，如果Map中的Key没有其他引用那么此Map会自动丢弃此键值对。

```java
public class Main {
    public static void main(String[] args) {
        Integer a = new Integer(1);

        WeakHashMap<Integer, String> weakHashMap = new WeakHashMap<>();
        weakHashMap.put(a, "yyds");
        System.out.println(weakHashMap);

        a = null;
        System.gc();
        
        System.out.println(weakHashMap);
    }
}
```

可以看到，当变量a的引用断开后，这时只有WeakHashMap本身对此对象存在引用，所以在GC之后，这个键值对就自动被舍弃了。所以说这玩意适合拿去做缓存

#### 虚引用（鬼引用）

虚引用相当于没有引用，随时都有可能会被回收。

源码非常简单：

```java
public class PhantomReference<T> extends Reference<T> {

    /**
     * Returns this reference object's referent.  Because the referent of a
     * phantom reference is always inaccessible, this method always returns
     * <code>null</code>.
     *
     * @return  <code>null</code>
     */
    public T get() {
        return null;
    }

    /**
     * Creates a new phantom reference that refers to the given object and
     * is registered with the given queue.
     *
     * <p> It is possible to create a phantom reference with a <tt>null</tt>
     * queue, but such a reference is completely useless: Its <tt>get</tt>
     * method will always return null and, since it does not have a queue, it
     * will never be enqueued.
     *
     * @param referent the object the new phantom reference will refer to
     * @param q the queue with which the reference is to be registered,
     *          or <tt>null</tt> if registration is not required
     */
    public PhantomReference(T referent, ReferenceQueue<? super T> q) {
        super(referent, q);
    }

}
```

`get()`方法得到的永远都是`null`，因为虚引用本身就不算是引用，相当于这个对象不存在任何引用，并且只能使用带队列的构造方法，以便对象被回收时接到通知

Java中4种引用的级别由高到低依次为： **强引用 > 软引用 > 弱引用 > 虚引用**

# 类与类加载

前面是JVM的内存结构，包括JVM对内存的划分，对内存区域的垃圾回收。接下来研究类文件结构以及类的加载机制

## 类文件结构

> 如果全世界所有的计算机指令集只有x86一种，操作系统只有Windows一种，那也许就不会有Java语言的出现。

“一次编写，到处运行”，Java最引以为傲的口号，标志着平台不再是限制编程语言的阻碍。

Java正式利用了这样的解决方案，将源代码编译为平台无关的中间格式，并通过对应的Java虚拟机读取和运行这些中间格式的编译文件，这样，我们只需要考虑不同平台的虚拟机如何编写，而Java语言本身很轻松地实现了跨平台。

现在，越来越多的开发语言都支持将源代码编译为`.class`字节码文件格式，以便能够直接交给JVM运行，包括Kotlin（安卓开发官方指定语言）、Groovy、Scala等。

![image-20230306165746693](https://oss.itbaima.cn/internal/markdown/2023/03/06/u2K8Y5yU1zf9LQ4.png)

源代码编译之后是如何保存在字节码文件中的

完整流程：
 javac把java代码转化成字节码，jvm把字节码转化成汇编，cpu根据汇编执行任务

```text
┌─────────────────────────────────────────────────────────────────┐
│                    第1步：编译（javac）                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Hello.java (源代码)                                            │
│   ┌─────────────────────────┐                                   │
│   │ public class Hello {    │                                   │
│   │     public static void  │                                   │
│   │     main(String[] args){│                                   │
│   │         System.out.     │                                   │
│   │         println("Hi");  │                                   │
│   │     }                   │                                   │
│   │ }                       │                                   │
│   └─────────────────────────┘                                   │
│                    ↓                                            │
│                 javac                                           │
│                    ↓                                            │
│   Hello.class (字节码)                                           │
│   ┌─────────────────────────┐                                   │
│   │ 0: getstatic #2         │                                   │
│   │ 3: ldc #3               │                                   │
│   │ 5: invokevirtual #4     │                                   │
│   │ 8: return               │                                   │
│   └─────────────────────────┘                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    第2步：运行（JVM）                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Hello.class (字节码)                                           │
│                    ↓                                            │
│              JVM 加载执行                                        │
│                    ↓                                            │
│   JIT编译器将热点字节码编译成汇编                                   │
│   ┌─────────────────────────────────────────┐                   │
│   │ 汇编代码（x86-64架构示例）                  │                  │
│   │                                          │                  │
│   │ mov     rax, [rip+0x123]  ;加载System.out │                  │
│   │ lea     rdx, [rip+0x456]  ; 加载字符串    │                   │
│   │ call    qword ptr [rax+0x20] ; 调用println│                  │
│   │ ret                       ; 返回         │                   │
│   └─────────────────────────────────────────┘                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    第3步：执行（CPU）                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   汇编指令 → CPU 解码 → 执行 → 结果                                │
│                    ↓                                            │
│              "Hi" 输出到控制台                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 类文件信息

`javap`命令可以反编译查看字节码文件，WinHex软件（Mac平台可以使用[010 Editor](https://www.macwk.com/soft/010-editor)）可以十六进制查看字节码文件。

```java
public class Main {
    public static void main(String[] args) {
        int i = 10;
        int a = i++;
        int b = ++i;
    }
}
```

将class文件拖动进去：

![image-20230306165815432](https://oss.itbaima.cn/internal/markdown/2023/03/06/QOvi5YpnaHTxrVU.png)

实际上Class文件采用了一种类似于C中结构体的伪结构来存储数据

```
Classfile /Users/nagocoler/Develop.localized/JavaHelloWorld/target/classes/com/test/Main.class
  Last modified 2022-2-23; size 444 bytes
  MD5 checksum 8af3e63f57bcb5e3d0eec4b0468de35b
  Compiled from "Main.java"
public class com.test.Main
  minor version: 0
  major version: 52
  flags: ACC_PUBLIC, ACC_SUPER
Constant pool:
   #1 = Methodref          #3.#21         // java/lang/Object."<init>":()V
   #2 = Class              #22            // com/test/Main
   #3 = Class              #23            // java/lang/Object
   #4 = Utf8               <init>
   #5 = Utf8               ()V
   #6 = Utf8               Code
   #7 = Utf8               LineNumberTable
   #8 = Utf8               LocalVariableTable
   #9 = Utf8               this
  #10 = Utf8               Lcom/test/Main;
  #11 = Utf8               main
  #12 = Utf8               ([Ljava/lang/String;)V
  #13 = Utf8               args
  #14 = Utf8               [Ljava/lang/String;
  #15 = Utf8               i
  #16 = Utf8               I
  #17 = Utf8               a
  #18 = Utf8               b
  #19 = Utf8               SourceFile
  #20 = Utf8               Main.java
  #21 = NameAndType        #4:#5          // "<init>":()V
  #22 = Utf8               com/test/Main
  #23 = Utf8               java/lang/Object
{
  public com.test.Main();
    descriptor: ()V
    flags: ACC_PUBLIC
    Code:
      stack=1, locals=1, args_size=1
         0: aload_0
         1: invokespecial #1                  // Method java/lang/Object."<init>":()V
         4: return
      LineNumberTable:
        line 11: 0
      LocalVariableTable:
        Start  Length  Slot  Name   Signature
            0       5     0  this   Lcom/test/Main;

  public static void main(java.lang.String[]);
    descriptor: ([Ljava/lang/String;)V
    flags: ACC_PUBLIC, ACC_STATIC
    Code:
      stack=1, locals=4, args_size=1
         0: bipush        10
         2: istore_1
         3: iload_1
         4: iinc          1, 1
         7: istore_2
         8: iinc          1, 1
        11: iload_1
        12: istore_3
        13: return
      LineNumberTable:
        line 13: 0
        line 14: 3
        line 15: 8
        line 16: 13
      LocalVariableTable:
        Start  Length  Slot  Name   Signature
            0      14     0  args   [Ljava/lang/String;
            3      11     1     i   I
            8       6     2     a   I
           13       1     3     b   I
}
SourceFile: "Main.java"
```

结构体中有两种数据类型，一个是无符号数，还有一个是表。

- 无符号数一般是基本数据类型，用u1、u2、u4、u8来表示，表示1个字节~8个字节的无符号数。可以表示数字、索引引用、数量值或是以UTF-8编码格式的字符串。
- 表包含多个无符号数，并且以"_info"结尾。

![image-20230306165846303](https://oss.itbaima.cn/internal/markdown/2023/03/06/4nFVBxOIo6QKjHA.png)

前4个字节（共32位）组成了魔数cafebabe，代表是个可运行的class文件

魔数后面4个字节存储的是字节码文件的版本号，前两个是次要版本号，后面两个是主要版本号，都以16进制表示的，10进制结果为：`34 -> 3*16 + 4 = 52`，其中`52`代表的是`JDK8`编译的字节码文件（51是JDK7、50是JDK6、53是JDK9，以此类推）

JVM会根据版本号决定是否能够运行，比如JDK6只能支持版本号为1.16的版本，也就是说必须是Java6之前的环境编译出来的字节码文件，否则无法运行。又比如我们现在安装的是JDK8版本，它能够支持的版本号为1.18，那么如果这时我们有一个通过Java7编译出来的字节码文件，依然是可以运行的，所以说Java版本是向下兼容的。

类的常量池存放了类中所有的常量信息（不是手动创建的final类型常量，而是程序运行一些需要用到的常量数据，比如字面量和符号引用等）由于常量的数量不是确定的，所以在最开始的位置会存放常量池中常量的数量（是从1开始计算的，不是0，比如这里是18，翻译为10进制就是24，所以实际上有23个常量）

每一项常量池里面的数据都是一个表，都是以_info结尾的：

![image-20230306165906177](https://oss.itbaima.cn/internal/markdown/2023/03/06/i857GLYJ1fSIKz4.png)

表中定义的内容：

![image-20230306165923282](https://oss.itbaima.cn/internal/markdown/2023/03/06/tizymh9BjYAFp3x.png)

首先上来就会有一个1字节的无符号数，它用于表示当前常量的类型：

| 类型                      | 标志 | 描述                                                         |
| ------------------------- | ---- | ------------------------------------------------------------ |
| CONSTANT_Utf8_info        | 1    | UTF-8编码格式的字符串                                        |
| CONSTANT_Integer_info     | 3    | 整形字面量（第一章我们演示的很大的数字，实际上就是以字面量存储在常量池中的） |
| CONSTANT_Class_info       | 7    | 类或接口的符号引用                                           |
| CONSTANT_String_info      | 8    | 字符串类型的字面量                                           |
| CONSTANT_Fieldref_info    | 9    | 字段的符号引用                                               |
| CONSTANT_Methodref_info   | 10   | 方法的符号引用                                               |
| CONSTANT_MethodType_info  | 16   | 方法类型                                                     |
| CONSTANT_NameAndType_info | 12   | 字段或方法的部分符号引用                                     |

符号引用是存放类中一些名称、数据之类的东西

常量池之后，紧接着就是访问标志，访问标志就是类的种类以及类上添加的一些关键字等内容：

![image-20230306170153604](https://oss.itbaima.cn/internal/markdown/2023/03/06/HE7QJpfbh6sOLji.png)

可以看到它只占了2个字节，那么它是如何表示访问标志呢?

![image-20230306170207034](https://oss.itbaima.cn/internal/markdown/2023/03/06/lY6sJwicX5d2FVg.png)

比如我们这里的Main类，它是一个普通的class类型，并且访问权限为public，那么它的访问标志值是这样计算的：

`ACC_PUBLIC | ACC_SUPER = 0x0001 | 0x0020 = 0x0021`（按位或运算）

再往下就是类索引、父类索引、接口索引：

![image-20230306170218340](https://oss.itbaima.cn/internal/markdown/2023/03/06/WskFX26NDco8Jgv.png)

它们的值也是指向常量池中的值，2号常量存储的当前类信息，3号常量存储父类信息，由于没有接口，所以接口数量为0，如果不为0还会有一个索引表来引用接口。

字段和方法表集合：

![image-20230306170228985](https://oss.itbaima.cn/internal/markdown/2023/03/06/p6wAqsZneuI8Wo3.png)

由于没有声明任何字段，所以先给Main类添加一个字段再重新加载一下：

java复制代码

```java
public class Main {

    public static int a = 10;

    public static void main(String[] args) {
        int i = 10;
        int a = i++;
        int b = ++i;
    }
}
```

![image-20230306170307227](https://oss.itbaima.cn/internal/markdown/2023/03/06/dzmcQUyFrH9kTWZ.png)

现在字节码就新增了一个字段表，实际上是刚刚添加的成员字段`a`的数据。

可以看到一共有四个2字节的数据：

![image-20230306170316904](https://oss.itbaima.cn/internal/markdown/2023/03/06/Phy8UoMGiLkpdsf.png)

首先是`access_flags`，这个与上面类标志的计算规则是一样的

![image-20230306170332081](https://oss.itbaima.cn/internal/markdown/2023/03/06/uCrZ8aG2EoxLM5c.png)

第二个数据`name_index`表示字段的名称常量，这里指向的是5号常量

![image-20230306170345473](https://oss.itbaima.cn/internal/markdown/2023/03/06/LOycXsCrm4vAjDk.png)

没问题，这里就是`a`,下一个是`descirptor_index`，存放的是描述符，不过这里因为不是方法而是变量，所以描述符直接写对应类型的标识字符即可，比如这里是`int`类型，那么就是`I`。

最后，`attrbutes_count`属性计数器，用于描述一些额外信息

接着就是方法表了：

![image-20230306170359554](https://oss.itbaima.cn/internal/markdown/2023/03/06/O4XnFbfRShkc8WZ.png)

可以看到方法表中一共有三个方法，其中第一个方法名称为`<init>`，表示它是一个构造方法，最后一个方法名称为`<clinit>`，这个是类在初始化时会调用的方法（是隐式的，自动生成的），它主要是用于静态变量初始化语句和静态块的执行，因为这里给静态成员变量a赋值为10，所以会在一开始为其赋值：

![image-20230306170411225](https://oss.itbaima.cn/internal/markdown/2023/03/06/zkJVicf764bFPXd.png)

第二个方法是`main`方法

`main`属性表实际上类中、字段中、方法中都可以携带自己的属性表，属性表存放的正是我们的代码、本地变量等数据，比如main方法就存在4个本地变量，那么它的本地变量存放在哪里呢：

![image-20230306170426154](https://oss.itbaima.cn/internal/markdown/2023/03/06/dPoWa74AeYJcIG1.png)

可以看到，属性信息呈现套娃状态，在此方法中的属性包括了一个Code属性，此属性正是我们的Java代码编译之后变成字节码指令，然后存放的地方，而在此属性中，又嵌套了本地变量表和源码行号表。

可以看到code中存放的就是所有的字节码指令：

![image-20230306170436483](https://oss.itbaima.cn/internal/markdown/2023/03/06/c7ebHq3TBxudK1A.png)

看本地变量表存放了方法中要用到的局部变量：

![image-20230306170452941](https://oss.itbaima.cn/internal/markdown/2023/03/06/heoLwXRVpuBYbZn.png)

可以看到一共有四个本地变量，第一个变量正是main方法的形参`String[] args`，并且表中存放了本地变量的长度、名称、描述符等内容

最后，类也有一些属性：

![image-20230306170510722](https://oss.itbaima.cn/internal/markdown/2023/03/06/fDTVYpAlaBF6j91.png)

此属性记录的是源文件名称

### 字节码指令

虚拟机的指令是由一个字节长度的、代表某种特定操作含义的数字（操作码，类似于机器语言），操作后面也可以携带0个或多个参数一起执行。JVM实际上并不是面向寄存器架构的，而是面向操作数栈，所以大多数指令都是不带参数的

```java
public class InterviewQuestion {
    public static void main(String[] args) {
        int a = 10;
        int b = 20;
        int c = a + b;
        System.out.println(c);
    }
}
// 字节码分析：
// 0: bipush 10        // 将10压入操作数栈
// 2: istore_1         // 弹出10，存入局部变量1 (a)
// 3: bipush 20        // 将20压入操作数栈
// 5: istore_2         // 弹出20，存入局部变量2 (b)
// 6: iload_1          // 将a压入栈
// 7: iload_2          // 将b压入栈
// 8: iadd             // 弹出a和b，相加，结果压栈
// 9: istore_3         // 弹出结果，存入局部变量3 (c)
// 10: getstatic #2    // 获取System.out
// 13: iload_3         // 加载c
// 14: invokevirtual #3 // 调用println
// 17: return          // 返回
// 关键点：
// 1. 局部变量表：[args, a, b, c]
// 2. 操作数栈：用于临时存储计算结果
// 3. iadd是int加法指令
```

i++ 和 ++i 的区别（字节码层面）

```java
public class IplusPlus {
    public void test() {
        int i = 0;
        int a = i++;  // i++: 先加载后自增
        int b = ++i;  // ++i: 先自增后加载
    }
}
// i++ 的字节码
0: iconst_0           // 0压栈
1: istore_1           // 存到局部变量1 (i)
2: iload_1            // 加载i (先加载)
3: iinc 1, 1          // i自增1 (后自增)
4: istore_2           // 存到a
// ++i 的字节码
5: iinc 1, 1          // i自增1 (先自增)
6: iload_1            // 加载i (后加载)
7: istore_3           // 存到b
```

### ASM字节码编程

ASM（某些JDK中内置）框架是用于支持字节码编程的框架，可以直接写字节码文件

比如创建一个普通的Main类

获取`ClassWriter`对象：

```java
public class Main {
    public static void main(String[] args) {
        ClassWriter writer = new ClassWriter(ClassWriter.COMPUTE_MAXS);
    }
}
```

- 0 这种方式不会自动计算操作数栈和局部临时变量表大小，需要自己手动来指定
- ClassWriter.COMPUTE_MAXS(1) 这种方式会自动计算上述操作数栈和局部临时变量表大小，但需要手动触发。
- ClassWriter.COMPUTE_FRAMES(2) 这种方式不仅会计算上述操作数栈和局部临时变量表大小，而且会自动计算StackMapFrames

这里使用`ClassWriter.COMPUTE_MAXS`即可

指定类的一些基本信息：

```java
public class Main {
    public static void main(String[] args) {
        ClassWriter writer = new ClassWriter(ClassWriter.COMPUTE_MAXS);
        //因为这里用到的常量比较多，所以说直接一次性静态导入：import static jdk.internal.org.objectweb.asm.Opcodes.*;
        writer.visit(V1_8, ACC_PUBLIC,"com/test/Main", null, "java/lang/Object",null);
    }
}
```

版本设定位Java8，然后修饰符设定为`ACC_PUBLIC`代表`public class Main`，类名称注意要携带包名，标签设置为`null`，父类设定为Object类，然后没有实现任何接口，所以说最后一个参数也是`null`。

将其进行保存：

```java
public class Main {
    public static void main(String[] args) {
        ClassWriter writer = new ClassWriter(ClassWriter.COMPUTE_MAXS);
        writer.visit(V1_8, ACC_PUBLIC,"com/test/Main", null, "java/lang/Object",null);
        //调用visitEnd表示结束编辑
        writer.visitEnd();

        try(FileOutputStream stream = new FileOutputStream("./Main.class")){
            stream.write(writer.toByteArray());  //直接通过ClassWriter将字节码文件转换为byte数组，并保存到根目录下
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}
```

添加一个无参构造方法：

```java
//通过visitMethod方法可以添加一个新的方法
writer.visitMethod(ACC_PUBLIC, "<init>", "()V", null, null);
```

反编译的结果为：

```java
package com.test;

public class Main {
	public Main() {
	}
}
```

Spring实现动态代理的CGLib框架底层正是调用了ASM框架来实现的

## 类加载机制

类字节码文件到底是如何加载到内存中的，加载之后又会做什么事情

### 类加载过程

运行Java程序必须要加载主类才能运行主类中的主方法，加载数据库驱动可以通过反射来将对应的数据库驱动类进行加载。

自动加载触发条件：

- 使用new关键字创建对象
- 使用某个类的静态成员（包括方法和字）（final类型不会触发自动加载）
- 使用反射对类信息进行获取的时候（数据库驱动也是这样的）
- 加载类的子类
- 加载接口的实现类，且接口带有`default`的方法默认实现

类的详细加载流程： 

![image-20230306170654350](https://oss.itbaima.cn/internal/markdown/2023/03/06/UIV6fJknmM4bojP.png)

类的生命周期一共有7个阶段

- **加载**：获取此类的二进制数据流，可以通过文件输入流来获取class类文件的`byte[]`，或者网络传输，再由类加载器进行加载（类加载器可以是JDK内置的，也可以是开发者自己撸的）类的所有信息会被加载到方法区中，并且在堆内存中会生成一个代表当前类的Class类对象，可以通过此对象以及反射机制来访问这个类的各种信息，数组类型本身不会通过类加载器进行加载，丢对象进去是要加载类的
- **校验**：验证阶段相当于是对加载的类进行一次规范校验
  - 文件格式的验证：
    - 是否魔数为CAFEBABE开头。
    - 主、次版本号是否可以由当前Java虚拟机运行
    - Class文件各个部分的完整性如何。
    - ...
- **准备**：为类变量分配内存，并为一些字段设定初始值，是系统规定的初始值，不是我们手动指定的初始值
- **解析**：将常量池内的符号引用替换为直接引用，所有引用变量指向了内存中的对象
- 初始化：代码开始执行，`<clinit>`方法执行

### 类加载器

Java提供了类加载器，以便自己控制类加载，可以自定义类加载器，也可以使用官方自带的类加载器去加载类。对于任意一个类，都必须由加载它的类加载器和这个类本身一起共同确立其在Java虚拟机中的唯一性。

只有两个类来自同一个Class文件并且是由同一个类加载器加载的，才能判断为是同一个。默认情况下，所有的类都是由JDK自带的类加载器进行加载

JDK内部提供的类加载器一共有三个，Main类其实是被AppClassLoader加载的，而JDK内部的类，都是由BootstrapClassLoader加载的，这其实就是为了实现双亲委派机制而做的

![image-20230306170728531](https://oss.itbaima.cn/internal/markdown/2023/03/06/RFaE7s5CnmylgkT.png)
