---
title: JUC并发
date: 2026-04-14 05:24:24
updated: 2026-04-15 15:10:24
cover: images/JUC.jpg
tags: JUC
categories: java
---

# 多线程

线程是程序执行流的最小单元，各个线程之间共享程序的内存空间（也就是所在进程的内存空间），上下文切换速度也高于进程

> Java 5的时候，新增了java.util.concurrent（JUC）包，包括大量用于多线程编程的工具类，目的是为了更好的支持高并发任务，让开发者进行多线程编程时减少竞争条件和死锁的问题

## 并发与并行

### 并发执行

并发执行也是我们同一时间只能处理一个任务，但是可以用时间片轮转处理

### 并行执行

并行执行同一时间可以做多个任务

排序操作可以用到并行计算，只需要等待所有子任务完成，最后将结果汇总即可。包括分布式计算模型MapReduce，也是采用的并行计算思路

## 锁机制

字节码中`monitorenter`和`monitorexit`分别对应加锁和释放锁，在执行`monitorenter`之前需要尝试获取锁，每个对象都有一个`monitor`监视器与之对应，而这里正是去获取对象监视器的所有权，一旦`monitor`所有权被某个线程持有，那么其他线程将无法获得（管程模型的一种实现）

![image-20230306170923799](https://oss.itbaima.cn/internal/markdown/2023/03/06/NFQ1m6gpz5WEZxV.png)

有两个`monitorexit`，第一个，这里在释放锁之后，会马上进入到一个goto指令跳转到15行，而15行对应的指令就是方法的返回指令，其实正常情况下只会执行第一个`monitorexit`释放锁，在释放锁之后就接着同步代码块后面的内容继续向下执行了。而第二个，其实是用来处理异常的，可以看到，它的位置是在12行，如果程序运行发生异常，那么就会执行第二个`monitorexit`，并且会继续向下通过`athrow`指令抛出异常

![image-20230306170938130](https://oss.itbaima.cn/internal/markdown/2023/03/06/bYUPEDwoBdkSxi3.png)

`synchronized`使用的锁存储在Java对象头中，对象是存放在堆内存中的，而每个对象内部，都有一部分空间用于存储对象头信息，而对象头信息中，则包含了Mark Word用于存放`hashCode`和对象的锁信息，在不同状态下，它存储的数据结构有一些不同。

![image-20230306170949225](https://oss.itbaima.cn/internal/markdown/2023/03/06/w5kq4gbBHcCMv1L.png)

### 重量级锁

在JDK6之前，`synchronized`一直被称为重量级锁，`monitor`依赖于底层操作系统的Lock实现，Java的线程是映射到操作系统的原生线程上，切换成本较高。在JDK6之后，锁的实现得到了改进

每个对象都可以有一个monitor与之关联，在Java虚拟机（HotSpot）中，monitor是由ObjectMonitor实现的：

```c++
ObjectMonitor() {
    _header       = NULL;
    _count        = 0; //记录个数
    _waiters      = 0,
    _recursions   = 0;
    _object       = NULL;
    _owner        = NULL;
    _WaitSet      = NULL; //处于wait状态的线程，会被加入到_WaitSet
    _WaitSetLock  = 0 ;
    _Responsible  = NULL ;
    _succ         = NULL ;
    _cxq          = NULL ;
    FreeNext      = NULL ;
    _EntryList    = NULL ; //处于等待锁block状态的线程，会被加入到该列表
    _SpinFreq     = 0 ;
    _SpinClock    = 0 ;
    OwnerIsThread = 0 ;
}
```

每个等待锁的线程都会被封装成ObjectWaiter对象，进入到如下机制：

![image-20230306171005840](https://oss.itbaima.cn/internal/markdown/2023/03/06/OvufwzKx7l6yNMB.png)

ObjectWaiter首先会进入 Entry Set等着，当线程获取到对象的`monitor`后进入 The Owner 区域并把`monitor`中的`owner`变量设置为当前线程，同时`monitor`中的计数器`count`加1，若线程调用`wait()`方法，将释放当前持有的`monitor`，`owner`变量恢复为`null`，`count`自减1，同时该线程进入 WaitSet集合中等待被唤醒。若当前线程执行完毕也将释放`monitor`并复位变量的值，以便其他线程进入获取对象的`monitor`。

每一个线程占用同步代码块的时间并不是很长，并且现代CPU基本都是多核心运行的，所以没有必要将竞争中的线程挂起然后又唤醒

在JDK1.4.2时，引入了自旋锁（JDK6之后默认开启），它不会将处于等待状态的线程挂起，而是通过无限循环的方式，不断检测是否能够获取锁，等待时间太长会浪费处理器资源，因此自旋锁的等待默认情况下为10次，如果失败，那么会进而采用重量级锁机制。

![image-20230306171016377](https://oss.itbaima.cn/internal/markdown/2023/03/06/9ifjs1mWwIxEKOP.png)

在JDK6之后，自旋的次数限制不再是固定的，而是自适应变化的，比如在同一个锁对象上，自旋等待刚刚成功获得过锁，并且持有锁的线程正在运行，那么这次自旋也是有可能成功的，所以会允许自旋更多次。当然，如果某个锁经常都自旋失败，那么有可能会不再采用自旋策略，而是直接使用重量级锁，变成了可适应自旋

### 轻量级锁

> 从JDK 1.6开始，为了减少获得锁和释放锁带来的性能消耗，就引入了轻量级锁。

#### 加锁过程

  步骤1：线程进入同步块

- 线程尝试执行 `synchronized` 代码块
- JVM 检查对象头的锁状态

  步骤2：检查是否为无锁状态

- 查看对象头的 Mark Word 最后两位 
- 如果是 `01`（无锁状态），进入下一步
- 如果是其他状态，走其他锁的逻辑
   步骤3：在当前栈帧中创建锁记录
- 线程在自己的栈帧中分配一块空间作为锁记录
- 将对象头的 Mark Word（包括 hashcode、分代年龄等）**拷贝**到锁记录中
- 这个拷贝的值叫 `displaced_mark_word`（ displaced：被置换的）
   步骤4：CAS 替换对象头
- 线程使用 CAS 操作，尝试将对象头的 Mark Word 替换为**指向锁记录的指针**
- 对象头最后两位变为 `00`（轻量级锁标志）
- **如果 CAS 成功**：进入步骤5
- **如果 CAS 失败**：说明有其他线程正在竞争，进入锁膨胀流程
   步骤5：获得轻量级锁
- 线程成功获得轻量级锁
- 可以安全执行同步代码块
- 对象头现在存储的是栈中锁记录的地址

#### 解锁过程

 步骤1：准备释放锁

- 线程执行完同步代码块
- 准备释放锁对象
   步骤2：CAS 恢复对象头
- 线程使用 CAS 操作，将对象头的 Mark Word 恢复为**锁记录中保存的原始值**
- 原始值包含了 hashcode、分代年龄等信息
- 对象头最后两位变回 `01`（无锁状态）
   步骤3：清理锁记录
- 如果 CAS 成功，锁释放完成
- 清空栈帧中的锁记录
- 如果 CAS 失败（说明有竞争），则进入重量级锁的释放流程

> CAS（Compare And Swap）是一种无锁算法，它并不会为对象加锁，检查当前数据的值是不是预期的，如果是，那就正常进行替换，如果不是，那么就替换失败。比如有两个线程都需要修改变量`i`的值，默认为10，现在一个线程要将其修改为20，另一个要修改为30，如果他们都使用CAS算法，那么并不会加锁访问`i`，而是直接尝试修改`i`的值，但是在修改时，需要确认`i`是不是10，如果是，表示其他线程还没对其进行修改，如果不是，那么说明其他线程已经将其修改，此时不能完成修改任务，修改失败。
>
> 在CPU中，CAS操作使用的是`cmpxchg`指令，能够从最底层硬件层面得到效率的提升

轻量级锁->重量级锁的锁膨胀：对象申请一个monitor，对象的mark word里面变成monitor的地址，线程1进入entryList里等待被唤醒，线程0cas对象时发现没有轻量级锁的lock record，不能正常解锁，只能按重量级锁的解锁流程把owner设置为null，再唤醒entrylist里的线程

如果CAS操作失败了的话，那么说明可能这时有线程已经进入这个同步代码块了，这时虚拟机会再次检查对象的Mark Word，是否指向当前线程的栈帧，如果是，说明不是其他线程，而是当前线程已经有了这个对象的锁，直接放心大胆进同步代码块即可。如果不是，那确实是被其他线程占用了。

Pasted image 20260331085159.png
 这时，轻量级锁一开始的想法就是错的（这时有对象在竞争资源，已经赌输了），所以说只能将锁膨胀为重量级锁，按照重量级锁的操作执行（注意锁的膨胀是不可逆的）

所以，轻量级锁 -> 失败 -> 自适应自旋锁 -> 失败 -> 重量级锁

解锁过程同样采用CAS算法，如果对象的MarkWord仍然指向线程的锁记录，那么就用CAS操作把对象的MarkWord和复制到栈帧中的Displaced Mark Word进行交换。如果替换失败，说明其他线程尝试过获取该锁，在释放锁的同时，需要唤醒被挂起的线程。

### 偏向锁

由于轻量锁在每次重入的过程中都会CAS对象的mark word，消耗算力，引入了偏向锁

特点：只有第一次CAS将线程ID设置到对象markword头，之后只会检查是否为自己，如果有其他线程来抢，那么偏向锁会根据当前状态，决定是否要恢复到未锁定或是膨胀为轻量级锁

### 锁消除和锁粗化

锁消除和锁粗化都是在运行时的一些优化方案，比如某段代码虽然加了锁，但是在运行时根本不可能出现各个线程之间资源争夺的情况，这种情况下，完全不需要任何加锁机制，所以锁会被消除。锁粗化则是代码中频繁地出现互斥同步操作，比如在一个循环内部加锁，这样明显是非常消耗性能的，所以虚拟机一旦检测到这种操作，会将整个同步范围进行扩展。**锁粗化 = 把多个小锁合并成一个大锁，减少加锁解锁的次数**。

## JMM内存模型

JMM和JVM中的内存模型不在同一个层次，JVM中的内存模型是虚拟机规范对整个内存区域的规划，而Java内存模型，是在JVM内存模型之上的抽象模型，具体实现依然是基于JVM内存模型实现的

### Java内存模型

![image-20230306171105367](https://oss.itbaima.cn/internal/markdown/2023/03/06/Kj2CiIVNOkpG3FS.png)

为了解决cpu缓存一致性的问题，需要各个处理器访问缓存时都遵循一些协议，在读写时要根据协议来进行操作，这类协议有MSI、MESI（Illinois Protocol）、MOSI、Synapse、Firefly及Dragon Protocol等。

Java也采用了类似的模型来实现支持多线程的内存模型：

![image-20230306171115671](https://oss.itbaima.cn/internal/markdown/2023/03/06/UMkWgFatBoLsfr5.png)

JMM（Java Memory Model）内存模型规定如下：

- 所有的变量全部存储在主内存（注意这里包括下面提到的变量，指的都是会出现竞争的变量，包括成员变量、静态变量等，而局部变量这种属于线程私有，不包括在内）
- 每条线程有着自己的工作内存（可以类比CPU的高速缓存）线程对变量的所有操作，必须在工作内存中进行，不能直接操作主内存中的数据。
- 不同线程之间的工作内存相互隔离，如果需要在线程之间传递内容，只能通过主内存完成，无法直接访问对方的工作内存。

也就是说，每一条线程如果要操作主内存中的数据，那么得先拷贝到自己的工作内存中，并对工作内存中数据的副本进行操作，操作完成之后，也需要从工作副本中将结果拷贝回主内存中，具体的操作就是`Save`（保存）和`Load`（加载）操作。

在JVM中具体是怎么体现：

- 主内存：对应堆中存放对象的实例的部分。
- 工作内存：对应线程的虚拟机栈的部分区域，虚拟机可能会对这部分内存进行优化，将其放在CPU的寄存器或是高速缓存中。比如在访问数组时，由于数组是一段连续的内存空间，所以可以将一部分连续空间放入到CPU高速缓存中，那么之后如果我们顺序读取这个数组，那么大概率会直接缓存命中

```java
public class Main {
    private static int i = 0;
    public static void main(String[] args) throws InterruptedException {
        new Thread(() -> {
            for (int j = 0; j < 100000; j++) i++;
            System.out.println("线程1结束");
        }).start();
        new Thread(() -> {
            for (int j = 0; j < 100000; j++) i++;
            System.out.println("线程2结束");
        }).start();
        //等上面两个线程结束
        Thread.sleep(1000);
        System.out.println(i);
    }
}
```

可以看到这里是两个线程同时对变量`i`各自进行100000次自增操作，但是实际得到的结果并不是期望的

JVM中，自增操作并不是由一条指令完成的

![image-20230306171129517](https://oss.itbaima.cn/internal/markdown/2023/03/06/2kHoMV1bLOGRe8y.png)

包括变量`i`的获取、修改、保存，都是被拆分为一个一个的操作，有可能出现在修改完保存之前，另一条线程也保存了，当前线程毫不知情

![image-20230306171140325](https://oss.itbaima.cn/internal/markdown/2023/03/06/x1O9jinomM3K2dF.png)

可以`synchronized`关键字添加同步代码块解决

### 重排序

在编译或执行时，为了优化程序的执行效率，编译器或处理器常常会对指令进行重排序，有以下情况：

1. 编译器重排序：Java编译器通过对Java代码语义的理解，根据优化规则对代码指令进行重排序。
2. 机器指令级别的重排序：现代处理器很高级，能够自主判断和变更机器指令的执行顺序。

指令重排序能够在不改变结果（单线程）的情况下，优化程序的运行效率

单线程下指令重排可以起到优化作用，在多线程下，会导致一些问题

### volatile关键字

- 原子性：做什么事情要么做完，要么就不做
- 可见性：多个线程访问同一个变量时，一个线程修改了这个变量的值，其他线程能够立即看到修改的值。
- 有序性：即程序执行的顺序按照代码的先后顺序执行

```java
public class Main {
    private static int a = 0;
    public static void main(String[] args) throws InterruptedException {
        new Thread(() -> {
            while (a == 0);
            System.out.println("线程结束！");
        }).start();

        Thread.sleep(1000);
        System.out.println("正在修改a的值...");
        a = 1;   //很明显，按照我们的逻辑来说，a的值被修改那么另一个线程将不再循环
    }
}
```

主线程中修改了a的值，另一个线程并不知道a的值发生了改变，所以循环中依然是使用旧值在进行判断，因此普通变量是不具有可见性的

除了硬加一把锁的方案，可以使用`volatile`关键字来解决，此关键字的第一个作用，就是保证变量的可见性。当写一个`volatile`变量时，JMM会把该线程本地内存中的变量强制刷新到主内存中去，并且这个写会操作会导致其他线程中的`volatile`变量缓存无效，这样，另一个线程修改了这个变时，当前线程会立即得知，并将工作内存中的变量更新为最新的版本。

```java
public class Main {
    //添加volatile关键字
    private static volatile int a = 0;
    public static void main(String[] args) throws InterruptedException {
        new Thread(() -> {
            while (a == 0);
            System.out.println("线程结束！");
        }).start();

        Thread.sleep(1000);
        System.out.println("正在修改a的值...");
        a = 1;
    }
}
```

当a发生改变时，循环立即结束。

volatile 和内存屏障的关系：

**volatile 本质上就是：变量读写前后，自动插入内存屏障。**

**volatile 靠内存屏障实现可见性 + 禁止指令重排。**

 volatile 有两个核心作用

1. **可见性**：一个线程写 volatile，其他线程能立刻读到最新值
2. **有序性**：禁止指令重排（不会把 volatile 前后代码乱序）

这两个效果**不是语法糖**，是靠**内存屏障**硬实现的。

volatile 具体怎么插屏障（JVM 规范）

JMM 规定：
 对 volatile 变量的 **写操作在写之后**插入：

- **StoreStore 屏障**
- **StoreLoad 屏障**

作用：

- 确保写之前的指令不会跑到写之后
- 强制把缓存刷新到主内存
- 防止写与后面的读重排

 对 volatile 变量的 **读操作在读之前**插入：

- **LoadLoad 屏障**
- **LoadStore 屏障**
   作用：
- 强制从主内存读取最新值
- 禁止读之后的指令跑到读前面

 最直观的理解

- 普通变量：CPU 想重排就重排，想缓存就缓存，线程之间不一定可见
- **volatile 变量：读写前后被 “栅栏” 围住，指令不能跨栅栏，缓存必须同步**

这个栅栏，就是**内存屏障**。

面试高频

> **volatile 通过在读写操作前后插入内存屏障，禁止指令重排序，并强制缓存与主内存同步，从而实现可见性和有序性。**

> 内存屏障（Memory Barrier）又称内存栅栏，是一个CPU指令，它的作用有两个：
>
> 1. 保证特定操作的顺序
> 2. 保证某些变量的内存可见性（volatile的内存可见性，就是依靠这个实现的）
>
> 由于编译器和处理器都能执行指令重排的优化，如果在指令间插入一条Memory Barrier则会告诉编译器和CPU，不管什么指令都不能和这条Memory Barrier指令重排序。
>
> ![image-20230306171216983](https://oss.itbaima.cn/internal/markdown/2023/03/06/upc28A41DwCBNO9.png)

所以`volatile`能够保证，之前的指令一定全部执行，之后的指令一定都没有执行，并且前面语句的结果对后面的语句可见。

`volatile`关键字的三个特性：

- 保证可见性
- 不保证原子性
- 防止指令重排

### happens-before原则

JMM提出了`happens-before`（先行发生）原则，定义一些禁止编译优化的场景，来向程序员做一些保证，只要是按照原则进行编程，那么就能够保持并发编程的正确性

**如果 A happens-before B，那么 A 做的修改，对 B 一定可见。**

它是一套**规则**，JMM 承诺：

只要你满足这条规则，多线程下就不会出现诡异的看不见值的问题。

1. 程序顺序规则

在**同一个线程**里：

前面代码 happens-before 后面代码。

> 前面写的变量，后面一定能看到。

1. 锁规则（synchronized / Lock）

**解锁 happens-before 加锁**

> 线程 A 释放锁之前做的修改，线程 B 拿到锁后一定能看到。

1. volatile 变量规则

**对 volatile 写 happens-before 后续对它的读**

> 写完立刻对后面读可见，这就是 volatile 可见性的官方解释。

1. 线程启动规则

`thread.start()` happens-before 线程里任何动作

> 主线程 start 前的修改，子线程一定能看到。

1. 线程终止规则

线程所有动作 happens-before `thread.join()` 返回

> 子线程做的修改，join 回来后主线程一定能看到。

1. 传递性

A happens-before B

B happens-before C

→ **A happens-before C**

# 多线程编程核心

## 锁框架

在JDK 5之后，并发包中新增了Lock接口（以及相关实现类）用来实现锁功能，Lock接口提供了与synchronized关键字类似的同步功能，但需要在使用时手动获取锁和释放锁

### Lock和Condition接口

使用并发包中的锁和传统的`synchronized`锁不太一样，这里的锁可认为是一把真正意义上的锁，每个锁都是一个对应的锁对象，只需向锁对象获取锁或是释放锁即可

```java
public interface Lock {
  	//获取锁，拿不到锁会阻塞，等待其他线程释放锁，获取到锁后返回
    void lock();
  	//同上，但是等待过程中会响应中断
    void lockInterruptibly() throws InterruptedException;
  	//尝试获取锁，但是不会阻塞，如果能获取到会返回true，不能返回false
    boolean tryLock();
  	//尝试获取锁，但是可以限定超时时间，如果超出时间还没拿到锁返回false，否则返回true，可以响应中断
    boolean tryLock(long time, TimeUnit unit) throws InterruptedException;
  	//释放锁
    void unlock();
  	//暂时可以理解为替代传统的Object的wait()、notify()等操作的工具
    Condition newCondition();
}
public interface Condition {
  	//与调用锁对象的wait方法一样，会进入到等待状态，但是这里需要调用Condition的signal或signalAll方法进行唤醒（感觉就是和普通对象的wait和notify是对应的）同时，等待状态下是可以响应中断的
 		void await() throws InterruptedException;
  	//同上，但不响应中断（看名字都能猜到）
  	void awaitUninterruptibly();
  	//等待指定时间，如果在指定时间（纳秒）内被唤醒，会返回剩余时间，如果超时，会返回0或负数，可以响应中断
  	long awaitNanos(long nanosTimeout) throws InterruptedException;
  	//等待指定时间（可以指定时间单位），如果等待时间内被唤醒，返回true，否则返回false，可以响应中断
  	boolean await(long time, TimeUnit unit) throws InterruptedException;
  	//可以指定一个明确的时间点，如果在时间点之前被唤醒，返回true，否则返回false，可以响应中断
  	boolean awaitUntil(Date deadline) throws InterruptedException;
  	//唤醒一个处于等待状态的线程，注意还得获得锁才能接着运行
  	void signal();
  	//同上，但是是唤醒所有等待线程
  	void signalAll();
}
```

同一个Condition的对象获取的await(), signal()才能配套使用

### 可重入锁

在当前线程持有锁的情况下继续加锁不会被阻塞，并且，加锁几次，就必须要解锁几次，否则此线程依旧持有锁

如果存在线程持有当前的锁，那么其他线程在获取锁时，是会暂时进入到等待队列（AQS的等待线程）

#### 公平锁与非公平锁

如果线程之间争抢同一把锁，会暂时进入到等待队列中，那么多个线程获得锁的顺序是不是一定是根据线程调用`lock()`方法时间来定的，`ReentrantLock`的构造方法中，是这样写的：

```java
public ReentrantLock() {
    sync = new NonfairSync();   //看名字貌似是非公平的
}
```

其实锁分为公平锁和非公平锁，ReentrantLock是采用的非公平锁作为底层锁机制

- 公平锁：多个线程按照申请锁的顺序去获得锁，线程会直接进入队列去排队，永远都是队列的第一位才能得到锁。
- 非公平锁：多个线程去获取锁的时候，会直接去尝试获取，获取不到，再去进入等待队列，如果能获取到，就直接获取到锁。

公平锁在任何情况下都一定是公平的吗？队列同步器中有所介绍

### 读写锁

可重入锁是一种排他锁，当一个线程得到锁之后，另一个线程必须等待其释放锁，否则一律不允许获取到锁。读写锁在同一时间，是可以让多个线程获取到锁，是针对于读写场景而出现的

读写锁维护了一个读锁和一个写锁，这两个锁的机制是不同的。

- 读锁：在没有任何线程占用写锁的情况下，同一时间可以有多个线程加读锁。
- 写锁：在没有任何线程占用读锁的情况下，同一时间只能有一个线程加写锁。
- 读写锁也有一个专门的接口：

```java
public interface ReadWriteLock {
    //获取读锁
    Lock readLock();

  	//获取写锁
    Lock writeLock();
}
```

此接口有一个实现类ReentrantReadWriteLock（实现的是ReadWriteLock接口，不是Lock接口，它本身并不是锁），注意操作ReentrantReadWriteLock时，不能直接上锁，而是需要获取读锁或是写锁，再进行锁操作

```java
public static void main(String[] args) throws InterruptedException {
    ReentrantReadWriteLock lock = new ReentrantReadWriteLock();
    lock.readLock().lock();
    new Thread(lock.readLock()::lock).start();
}
```

有读锁状态下无法加写锁，反之亦然

ReentrantReadWriteLock不仅具有读写锁的功能，还保留了可重入锁和公平/非公平机制

#### 锁降级和锁升级

锁降级指的是写锁降级为读锁。当一个线程持有写锁的情况下，虽然其他线程不能加读锁，但是线程自己是可以加读锁的：

```java
public static void main(String[] args) throws InterruptedException {
    ReentrantReadWriteLock lock = new ReentrantReadWriteLock();
    lock.writeLock().lock();
    lock.readLock().lock();
    System.out.println("成功加读锁！");
}
```

一旦写锁被释放，那么主线程就只剩下读锁了，因为读锁可以被多个线程共享，所以这时第二个线程也添加了读锁。而这种操作，就被称之为"锁降级"（注意不是先释放写锁再加读锁，而是持有写锁的情况下申请读锁再释放写锁）

在仅持有读锁的情况下去申请写锁，属于"锁升级"，ReentrantReadWriteLock是不支持的，会死锁

```java
public static void main(String[] args) throws InterruptedException {
    ReentrantReadWriteLock lock = new ReentrantReadWriteLock();
    lock.readLock().lock();
    lock.writeLock().lock();
    System.out.println("所升级成功！");
}
```

可以看到线程直接卡在加写锁的那一句了

### 队列同步器AQS

ReentrantLock的`lock()`方法

```java
public void lock() {
    sync.lock();
}
```

内部实际上交给了Sync对象在进行，并且很多方法都是依靠Sync对象在进行：

```java
public void unlock() {
    sync.release(1);
}
```

公平锁和非公平锁都是继承自Sync，而Sync是继承自AbstractQueuedSynchronizer，简称队列同步器：

```java
abstract static class Sync extends AbstractQueuedSynchronizer {
   //...
}

static final class NonfairSync extends Sync {}
static final class FairSync extends Sync {}
```

#### 底层原理

##### AQS 是什么？它的核心思想是什么？

**回答要点**：

- **全称**：AbstractQueuedSynchronizer，抽象队列同步器
- **定位**：JUC 包的**基石**，ReentrantLock、CountDownLatch、Semaphore 等都基于它
- **核心思想**：如果共享资源空闲，则直接获取；否则进入 **CLH 队列**等待

**加分回答**：

> AQS 采用**模板方法模式**，将**队列管理、阻塞唤醒**等通用逻辑封装在框架中，子类只需实现 `tryAcquire/tryRelease` 等方法，通过 **CAS + volatile** 维护 `state` 状态，实现了**无锁化**的同步机制。

##### Q2：AQS 的核心组件有哪些？

**回答要点**：

| 组件         | 说明                                                       |
| ------------ | ---------------------------------------------------------- |
| **state**    | `volatile int`，同步状态，子类定义含义（锁计数、许可数等） |
| **CLH 队列** | 双向链表，存储等待线程的 Node                              |
| **Node**     | 队列节点，包含 thread、waitStatus、prev、next、nextWaiter  |

**加分回答**：

> Node 的 `waitStatus` 有 5 种状态：`CANCELLED`(1)、`SIGNAL`(-1)、`CONDITION`(-2)、`PROPAGATE`(-3)、0(初始)。`nextWaiter` 字段在同步队列中表示模式（共享/独占），在条件队列中作为下一个节点指针，实现了**字段复用**。

##### Q3：讲一下 AQS 独占模式获取锁的流程

**回答要点**（画图 + 口述）： 

```java
public final void acquire(int arg) {
    if (!tryAcquire(arg) && 
        acquireQueued(addWaiter(Node.EXCLUSIVE), arg))
        selfInterrupt();
}
```

**步骤拆解**：

1. **tryAcquire**：子类实现，尝试 CAS 获取锁
2. **失败则 addWaiter**：创建独占节点，CAS 入队
3. **acquireQueued**：
   - 前驱是头节点时，再次尝试获取锁
   - 获取成功则设置新头节点，原头节点出队
   - 失败则通过 `shouldParkAfterFailedAcquire` 将前驱设为 `SIGNAL`，然后 `park` 阻塞

**加分回答**：

> 关键在于 `shouldParkAfterFailedAcquire` 方法，它确保前驱节点状态为 `SIGNAL`，这样当前驱释放锁时才能正确唤醒后继。这种**前驱驱动**的设计避免了频繁检查，提高了效率。

##### Q4：AQS 如何实现公平锁和非公平锁？

**回答要点**：

**非公平锁**（ReentrantLock 默认）：

```java
final boolean nonfairTryAcquire(int acquires) {
    // 直接 CAS，不管队列中是否有等待线程
    if (compareAndSetState(0, acquires)) {
        setExclusiveOwnerThread(current);
        return true;
    }
    // 重入逻辑...
}
```

**公平锁**：

```java
protected final boolean tryAcquire(int acquires) {
    // 关键：检查队列中是否有前驱
    if (!hasQueuedPredecessors() && 
        compareAndSetState(0, acquires)) {
        setExclusiveOwnerThread(current);
        return true;
    }
    // 重入逻辑...
}
```

**区别**：

- 非公平锁：新线程直接 CAS，**可能插队**，吞吐量更高
- 公平锁：检查 `hasQueuedPredecessors()`，**严格 FIFO**

**加分回答**：

> 非公平锁虽然可能导致线程饥饿，但减少了线程切换开销。实测非公平锁吞吐量比公平锁高 **10-20%**。`ReentrantLock` 默认非公平锁，可通过构造参数选择!

 完整的流程：Pasted image 20260401170017.png

#### 公平锁一定公平吗？

`tryAcquire()`方法的实现：

```java
@ReservedStackAccess
protected final boolean tryAcquire(int acquires) {
    final Thread current = Thread.currentThread();
    int c = getState();
    if (c == 0) {
        if (!hasQueuedPredecessors() &&   //注意这里，公平锁的机制是，一开始会查看是否有节点处于等待
            compareAndSetState(0, acquires)) {   //如果前面的方法执行后发现没有等待节点，就直接进入占锁环节了
            setExclusiveOwnerThread(current);
            return true;
        }
    }
    else if (current == getExclusiveOwnerThread()) {
        int nextc = c + acquires;
        if (nextc < 0)
            throw new Error("Maximum lock count exceeded");
        setState(nextc);
        return true;
    }
    return false;
}
```

所以`hasQueuedPredecessors()`这个环节容不得半点闪失，否则会直接破坏掉公平性

如果线程1已经持有锁了，这时线程2来争抢这把锁，走到`hasQueuedPredecessors()`，判断出为 `false`，线程2继续运行，然后线程2肯定获取锁失败（因为锁这时是被线程1占有的），因此就进入到等待队列中：

```java
private Node enq(final Node node) {
    for (;;) {
        Node t = tail;
        if (t == null) { // 线程2进来之后，肯定是要先走这里的，因为head和tail都是null
            if (compareAndSetHead(new Node()))
                tail = head;   //这里就将tail直接等于head了，注意这里完了之后还没完，这里只是初始化过程
        } else {
            node.prev = t;
            if (compareAndSetTail(t, node)) {
                t.next = node;
                return t;
            }
        }
    }
}

private Node addWaiter(Node mode) {
    Node node = new Node(Thread.currentThread(), mode);
    Node pred = tail;
    if (pred != null) {   //由于一开始head和tail都是null，所以线程2直接就进enq()了
        node.prev = pred;
        if (compareAndSetTail(pred, node)) {
            pred.next = node;
            return node;
        }
    }
    enq(node);   //请看上面
    return node;
}
```

而线程3也来抢锁了，按照正常流程走到了`hasQueuedPredecessors()`方法，而在此方法中：

```java
public final boolean hasQueuedPredecessors() {
    Node t = tail; // Read fields in reverse initialization order
    Node h = head;
    Node s;
  	//这里直接判断h != t，而此时线程2才刚刚执行完 tail = head，所以直接就返回false了
    return h != t &&
        ((s = h.next) == null || s.thread != Thread.currentThread());
}
```

因此，线程3这时就紧接着准备开始CAS操作了，这时线程1释放锁了，线程3直接开始CAS判断，而线程2还在插入节点状态，结果是线程3先拿到了锁，这显然是违背了公平锁的公平机制。

一张图就是：

![image-20230814160110441](https://oss.itbaima.cn/internal/markdown/2023/08/14/5IwjDocXvHpkW8O.png)

因此公不公平全看`hasQueuedPredecessors()`，而此方法只有在等待队列中存在节点时才能保证不会出现问题。所以公平锁，只有在等待队列存在节点时，才是真正公平的。

#### 条件队列的实现原理？

1. **await()**：
   - 将当前线程封装为 `CONDITION` 状态节点，加入条件队列
   - 完全释放锁（`fullyRelease` 处理重入）
   - 阻塞直到被 `signal` 或中断
2. **signal()**：
   - 将条件队列头节点转移到同步队列
   - 修改状态为 0，设置前驱为 `SIGNAL`
   - 如果前驱取消则直接唤醒

**加分回答**：

> 注意：`await` 前必须**持有锁**，`signal` 后线程**不会立即执行**，需要重新竞争锁。一个 `Condition` 对象维护一个单向的条件队列，而 `ReentrantLock` 可以有多个 `Condition`（如 `ArrayBlockingQueue` 中的 `notEmpty` 和 `notFull`）

#### 三者关系（核心流程）

condition中的条件队列 = 等待队列，单向链表存放被await()的线程
 同步队列双向链表存放等锁的线程

1. **线程入队（同步队列）**
   - 线程 `lock()` 抢锁失败 → 进入 **同步队列** 阻塞排队。
2. **条件等待（同步 → 条件）**
   - 线程拿到锁后，调用 `condition.await()`：
     - 释放锁
     - 从 **同步队列** 移除
     - 加入对应 **条件队列** 等待唤醒
3. **条件唤醒（条件 → 同步）**
   - 另一线程 `condition.signal()`：
     - 把 **条件队列** 头节点取出
     - **转移到同步队列** 尾部
     - 此时线程并未真正唤醒，仍需等锁
4. **真正执行**
   - 当持有锁的线程 `unlock()` 释放锁后，**同步队列** 中的线程（包括刚转移过来的）才会被唤醒并重新竞争锁。

## 原子类

如果要保证`i++`的原子性，那么我们的唯一选择就是加锁，那么除了加锁之外，JUC为提供了原子类，底层采用CAS算法，它是一种用法简单、性能高效、线程安全地更新变量的方式

所有的原子类都位于`java.util.concurrent.atomic`包下。

### 原子类介绍

常用基本数据类，有对应的原子类封装：

- AtomicInteger：原子更新int
- AtomicLong：原子更新long
- AtomicBoolean：原子更新boolean

```java
public class Main {
    public static void main(String[] args) {
        int i = 1;
        System.out.println(i++);
    }
}
public class Main {
    public static void main(String[] args) {
        AtomicInteger i = new AtomicInteger(1);
        System.out.println(i.getAndIncrement());  //如果想实现i += 2这种操作，可以使用 addAndGet() 自由设置delta 值
    }
}
```

数值封装到此类中必须调用构造方法，没有自动拆箱装箱机制

底层：

```java
private volatile int value;

public AtomicInteger(int initialValue) {
    value = initialValue;
}

public AtomicInteger() {
}
```

封装了一个`volatile`类型的int值，这样能够保证可见性，在CAS操作的时候不会出现问题。

```java
private static final Unsafe unsafe = Unsafe.getUnsafe();
private static final long valueOffset;

static {
    try {
        valueOffset = unsafe.objectFieldOffset
            (AtomicInteger.class.getDeclaredField("value"));
    } catch (Exception ex) { throw new Error(ex); }
}
```

可以看到最上面是和AQS采用了类似的机制，因为要使用CAS算法更新value的值，所以得先计算出value字段在对象中的偏移地址，CAS直接修改对应位置的内存即可（可见Unsafe类的作用巨大，很多的底层操作都要靠它来完成）

自增操作是怎么在运行的：

```java
public final int getAndIncrement() {
    return unsafe.getAndAddInt(this, valueOffset, 1);
}
public final int getAndAddInt(Object o, long offset, int delta) {  //delta就是变化的值，++操作就是自增1
    int v;
    do {
      	//volatile版本的getInt()
      	//能够保证可见性
        v = getIntVolatile(o, offset);
    } while (!compareAndSwapInt(o, offset, v, v + delta));  //这里是开始cas替换int的值，每次都去拿最新的值去进行替换，如果成功则离开循环，不成功说明这个时候其他线程先修改了值，就进下一次循环再获取最新的值然后再cas一次，直到成功为止
    return v;
}
```

这是一个`do-while`循环，采用自旋形式，来不断进行CAS操作，直到成功。

![image-20230306171720896](https://oss.itbaima.cn/internal/markdown/2023/03/06/JL3ZjbmwFW67tOM.png)

原子类底层也是采用了CAS算法来保证的原子性，包括`getAndSet`、`getAndAdd`等方法都是这样。原子类也直接提供了CAS操作方法

```java
public static void main(String[] args) throws InterruptedException {
    AtomicInteger integer = new AtomicInteger(10);
    System.out.println(integer.compareAndSet(30, 20));
    System.out.println(integer.compareAndSet(10, 20));
    System.out.println(integer);
}
```

如果想以普通变量的方式来设定值，那么可以使用`lazySet()`方法，这样就不采用`volatile`的立即可见机制了。

```java
AtomicInteger integer = new AtomicInteger(1);
integer.lazySet(2);
```

除了基本类有原子类以外，基本类型的数组类型也有原子类：

- AtomicIntegerArray：原子更新int数组
- AtomicLongArray：原子更新long数组
- AtomicReferenceArray：原子更新引用数组

其实原子数组和原子类型一样的，可以对数组内的元素进行原子操作：

```java
public static void main(String[] args) throws InterruptedException {
    AtomicIntegerArray array = new AtomicIntegerArray(new int[]{0, 4, 1, 3, 5});
    Runnable r = () -> {
        for (int i = 0; i < 100000; i++)
            array.getAndAdd(0, 1);
    };
    new Thread(r).start();
    new Thread(r).start();
    TimeUnit.SECONDS.sleep(1);
    System.out.println(array.get(0));
}
```

在JDK8之后，新增了`DoubleAdder`和`LongAdder`，在高并发情况下，`LongAdder`的性能比`AtomicLong`的性能更好，主要体现在自增上，它的大致原理：在低并发情况下，和`AtomicLong`是一样的，对value值进行CAS操作，但是出现高并发的情况时，`AtomicLong`会进行大量的循环操作来保证同步，而`LongAdder`会将对value值的CAS操作分散为对数组`cells`中多个元素的CAS操作（内部维护一个Cell[] as数组，每个Cell里面有一个初始值为0的long型变量，在高并发时会进行分散CAS，就是不同的线程可以对数组中不同的元素进行CAS自增，这样就避免了所有线程都对同一个值进行CAS），只需要最后再将结果加起来即可。

![image-20230306171732740](https://oss.itbaima.cn/internal/markdown/2023/03/06/KksGxhMYABe7nED.png)

使用如下：

```java
public static void main(String[] args) throws InterruptedException {
    LongAdder adder = new LongAdder();
    Runnable r = () -> {
        for (int i = 0; i < 100000; i++)
            adder.add(1);
    };
    for (int i = 0; i < 100; i++)
        new Thread(r).start();   //100个线程
    TimeUnit.SECONDS.sleep(1);
    System.out.println(adder.sum());   //最后求和即可
}
```

引用类型，也是可以实现原子操作：

```java
public static void main(String[] args) throws InterruptedException {
    String a = "Hello";
    String b = "World";
    AtomicReference<String> reference = new AtomicReference<>(a);
    reference.compareAndSet(a, b);
    System.out.println(reference.get());
}
```

JUC还提供了字段原子更新器，可以对类中的某个指定字段进行原子操作（注意字段必须添加volatile关键字）：

```java
public class Main {
    public static void main(String[] args) throws InterruptedException {
        Student student = new Student();
        AtomicIntegerFieldUpdater<Student> fieldUpdater =
                AtomicIntegerFieldUpdater.newUpdater(Student.class, "age");
        System.out.println(fieldUpdater.incrementAndGet(student));
    }

    public static class Student{
        volatile int age;
    }
}
```

### ABA问题及解决方案

线程1和线程2同时开始对`a`的值进行CAS修改，但是线程1的速度比较快，将a的值修改为2之后紧接着又修改回1，这时线程2才开始进行判断，发现a的值是1，所以CAS操作成功。

很明显，这里的1已经不是一开始的那个1了，而是被重新赋值的1，这也是CAS操作存在的问题（无锁虽好，但是问题多多），它只会机械地比较当前值是不是预期值，但是并不会关心当前值是否被修改过，这种问题称之为`ABA`问题

JUC提供了带版本号的引用类型，只要每次操作都记录一下版本号，并且版本号不会重复，那么就可以解决ABA问题了：

```java
public static void main(String[] args) throws InterruptedException {
    String a = "Hello";
    String b = "World";
    AtomicStampedReference<String> reference = new AtomicStampedReference<>(a, 1);  //在构造时需要指定初始值和对应的版本号
    reference.attemptStamp(a, 2);   //可以中途对版本号进行修改，注意要填写当前的引用对象
    System.out.println(reference.compareAndSet(a, b, 2, 3));   //CAS操作时不仅需要提供预期值和修改值，还要提供预期版本号和新的版本号
}
```

## 并发容器

### 并发容器介绍

JUC提供了专用于并发场景下的容器，ArrayList在多线程环境下是没办法使用的，可以替换为JUC提供的多线程专用集合类：

```java
public static void main(String[] args) throws InterruptedException {
    List<String> list = new CopyOnWriteArrayList<>();  //这里使用CopyOnWriteArrayList来保证线程安全
    Runnable r = () -> {
        for (int i = 0; i < 100; i++)
            list.add("lbwnb");
    };
    for (int i = 0; i < 100; i++)
        new Thread(r).start();
    TimeUnit.SECONDS.sleep(1);
    System.out.println(list.size());
}
```

使用了`CopyOnWriteArrayList`之后，再没出现过上面的问题。

`add()`操作：

```java
public boolean add(E e) {
    final ReentrantLock lock = this.lock;
    lock.lock();   //直接加锁，保证同一时间只有一个线程进行添加操作
    try {
        Object[] elements = getArray();  //获取当前存储元素的数组
        int len = elements.length;
        Object[] newElements = Arrays.copyOf(elements, len + 1);   //直接复制一份数组
        newElements[len] = e;   //修改复制出来的数组
        setArray(newElements);   //将元素数组设定为复制出来的数组
        return true;
    } finally {
        lock.unlock();
    }
}
```

可以看到添加操作是直接上锁，并且会先拷贝一份当前存放元素的数组，然后对数组进行修改，再将此数组替换（CopyOnWrite），读操作：

```java
public E get(int index) {
    return get(getArray(), index);
}
```

因此，`CopyOnWriteArrayList`对于读操作不加锁，而对于写操作是加锁的，类似读写锁机制，这样就可以保证不丢失读性能的情况下，写操作不会出现问题。

接着我们来看对于HashMap的并发容器`ConcurrentHashMap`：

```java
public static void main(String[] args) throws InterruptedException {
    Map<Integer, String> map = new ConcurrentHashMap<>();
    for (int i = 0; i < 100; i++) {
        int finalI = i;
        new Thread(() -> {
            for (int j = 0; j < 100; j++)
                map.put(finalI * 100 + j, "lbwnb");
        }).start();
    }
    TimeUnit.SECONDS.sleep(1);
    System.out.println(map.size());
}
```

可以看到这里的ConcurrentHashMap就没有出现之前HashMap的问题了。因为线程之间会争抢同一把锁，LongAdder有一种压力分散思想，既然每个线程都想抢锁，那干脆多搞几把锁，让每个人都能拿到，这样就不会存在等待的问题了，而JDK7之前，ConcurrentHashMap的原理也比较类似，它将所有数据分为一段一段地存储，先分很多段出来，每一段都给一把锁，当一个线程占锁访问时，只会占用其中一把锁，也就是仅仅锁了一小段数据，而其他段的数据依然可以被其他线程正常访问。

![image-20230306171955430](https://oss.itbaima.cn/internal/markdown/2023/03/06/elxSQDBkcmqWtGU.png)

JDK8下的HashMap的结构：

![img](https://oss.itbaima.cn/internal/markdown/2023/08/14/bI7At2sXqRwjolF.jpg)

HashMap就是利用了哈希表，哈希表的本质其实就是一个用于存放后续节点的头结点的数组，数组里面的每一个元素都是一个头结点（也可以说就是一个链表），当要新插入一个数据时，会先计算该数据的哈希值，找到数组下标，然后创建一个新的节点，添加到对应的链表后面。当链表的长度达到8时，会自动将链表转换为红黑树，这样能使得原有的查询效率大幅度降低！当使用红黑树之后，我们就可以利用二分搜索的思想，快速地去寻找我们想要的结果，而不是像链表一样挨个去看。

`put()`操作：

```java
public V put(K key, V value) {
    return putVal(key, value, false);
}

//有点小乱，如果看着太乱，可以在IDEA中折叠一下代码块，不然有点难受
final V putVal(K key, V value, boolean onlyIfAbsent) {
    if (key == null || value == null) throw new NullPointerException(); //键值不能为空，基操
    int hash = spread(key.hashCode());    //计算键的hash值，用于确定在哈希表中的位置
    int binCount = 0;   //一会用来记录链表长度的，忽略
    for (Node<K,V>[] tab = table;;) {    //无限循环，而且还是并发包中的类，盲猜一波CAS自旋锁
        Node<K,V> f; int n, i, fh;
        if (tab == null || (n = tab.length) == 0)
            tab = initTable();    //如果数组（哈希表）为空肯定是要进行初始化的，然后再重新进下一轮循环
        else if ((f = tabAt(tab, i = (n - 1) & hash)) == null) {   //如果哈希表该位置为null，直接CAS插入结点作为头结即可（注意这里会将f设置当前哈希表位置上的头结点）
            if (casTabAt(tab, i, null,
                         new Node<K,V>(hash, key, value, null)))  
                break;                   // 如果CAS成功，直接break结束put方法，失败那就继续下一轮循环
        } else if ((fh = f.hash) == MOVED)   //头结点哈希值为-1，这里只需要知道是因为正在扩容即可
            tab = helpTransfer(tab, f);   //帮助进行迁移，完事之后再来下一次循环
        else {     //特殊情况都完了，这里就该是正常情况了，
            V oldVal = null;
            synchronized (f) {   //在前面的循环中f肯定是被设定为了哈希表某个位置上的头结点，这里直接把它作为锁加锁了，防止同一时间其他线程也在操作哈希表中这个位置上的链表或是红黑树
                if (tabAt(tab, i) == f) {
                    if (fh >= 0) {    //头结点的哈希值大于等于0说明是链表，下面就是针对链表的一些列操作
                        ...实现细节略
                    } else if (f instanceof TreeBin) {   //肯定不大于0，肯定也不是-1，还判断是不是TreeBin，所以不用猜了，肯定是红黑树，下面就是针对红黑树的情况进行操作
                      	//在ConcurrentHashMap并不是直接存储的TreeNode，而是TreeBin
                        ...实现细节略
                    }
                }
            }
          	//根据链表长度决定是否要进化为红黑树
            if (binCount != 0) {
                if (binCount >= TREEIFY_THRESHOLD)
                    treeifyBin(tab, i);   //注意这里只是可能会进化为红黑树，如果当前哈希表的长度小于64，它会优先考虑对哈希表进行扩容
                if (oldVal != null)
                    return oldVal;
                break;
            }
        }
    }
    addCount(1L, binCount);
    return null;
}
```

总结一下：

![image-20230306172102878](https://oss.itbaima.cn/internal/markdown/2023/03/06/qvRH4wsIi9fczVh.png)

`get()`操作：

```java
public V get(Object key) {
    Node<K,V>[] tab; Node<K,V> e, p; int n, eh; K ek;
    int h = spread(key.hashCode());   //计算哈希值
    if ((tab = table) != null && (n = tab.length) > 0 &&
        (e = tabAt(tab, (n - 1) & h)) != null) {
      	// 如果头结点就是我们要找的，那直接返回值就行了
        if ((eh = e.hash) == h) {
            if ((ek = e.key) == key || (ek != null && key.equals(ek)))
                return e.val;
        }
      	//要么是正在扩容，要么就是红黑树，负数只有这两种情况
        else if (eh < 0)
            return (p = e.find(h, key)) != null ? p.val : null;
      	//确认无误，肯定在列表里，开找
        while ((e = e.next) != null) {
            if (e.hash == h &&
                ((ek = e.key) == key || (ek != null && key.equals(ek))))
                return e.val;
        }
    }
  	//没找到只能null了
    return null;
}
```

综上，ConcurrentHashMap的put操作，实际上是对哈希表上的所有头结点元素分别加锁，理论上来说哈希表的长度很大程度上决定了ConcurrentHashMap在同一时间能够处理的线程数量，这也是为什么`treeifyBin()`会优先考虑为哈希表进行扩容的原因。这种加锁方式比JDK7的分段锁机制性能更好

### 阻塞队列

#### 阻塞队列解决了什么问题

**回答要点**：

> 阻塞队列（BlockingQueue）是一个支持**线程安全**的队列，当队列满时，生产者线程被阻塞；当队列空时，消费者线程被阻塞。它解决了**生产者-消费者模式**中的线程同步问题，无需手动使用 `wait/notify`。

**核心特性**：

- **线程安全**：内部通过锁保证并发安全
- **阻塞特性**：自动阻塞/唤醒线程
- **解耦**：生产者和消费者通过队列解耦

阻塞队列本身也是队列，但是它是适用于多线程环境下的，基于ReentrantLock实现的，它的接口定义如下：

```java
public interface BlockingQueue<E> extends Queue<E> {
   	boolean add(E e);

    //入队，如果队列已满，返回false否则返回true（非阻塞）
    boolean offer(E e);

    //入队，如果队列已满，阻塞线程直到能入队为止
    void put(E e) throws InterruptedException;

    //入队，如果队列已满，阻塞线程直到能入队或超时、中断为止，入队成功返回true否则false
    boolean offer(E e, long timeout, TimeUnit unit)
        throws InterruptedException;

    //出队，如果队列为空，阻塞线程直到能出队为止
    E take() throws InterruptedException;

    //出队，如果队列为空，阻塞线程直到能出队超时、中断为止，出队成功正常返回，否则返回null
    E poll(long timeout, TimeUnit unit)
        throws InterruptedException;

    //返回此队列理想情况下（在没有内存或资源限制的情况下）可以不阻塞地入队的数量，如果没有限制，则返回 Integer.MAX_VALUE
    int remainingCapacity();

    boolean remove(Object o);

    public boolean contains(Object o);

  	//一次性从BlockingQueue中获取所有可用的数据对象（还可以指定获取数据的个数）
    int drainTo(Collection<? super E> c);

    int drainTo(Collection<? super E> c, int maxElements);
```

比如现在有一个容量为3的阻塞队列，这个时候一个线程`put`向其添加了三个元素，第二个线程接着`put`向其添加三个元素，那么这个时候由于容量已满，会直接被阻塞，而这时第三个线程从队列中取走2个元素，线程二停止阻塞，先丢两个进去，还有一个还是进不去，所以说继续阻塞。

![image-20230306172123711](https://oss.itbaima.cn/internal/markdown/2023/03/06/nRik6PHxY24Nlzr.png)

利用阻塞队列，我们可以轻松地实现消费者和生产者模式

> 所谓的生产者消费者模型，是通过一个容器来解决生产者和消费者的强耦合问题。通俗的讲，就是生产者在不断的生产，消费者也在不断的消费，可是消费者消费的产品是生产者生产的，这就必然存在一个中间容器，我们可以把这个容器想象成是一个货架，当货架空的时候，生产者要生产产品，此时消费者在等待生产者往货架上生产产品，而当货架有货物的时候，消费者可以从货架上拿走商品，生产者此时等待货架出现空位，进而补货，这样不断的循环。

通过多线程编程，来模拟一个餐厅的2个厨师和3个顾客，假设厨师炒出一个菜的时间为3秒，顾客吃掉菜品的时间为4秒，窗口上只能放一个菜。

使用阻塞队列`ArrayBlockingQueue`实现类：

```java
public class Main {
    public static void main(String[] args) throws InterruptedException {
        BlockingQueue<Object> queue = new ArrayBlockingQueue<>(1);
        Runnable supplier = () -> {
            while (true){
                try {
                    String name = Thread.currentThread().getName();
                    System.err.println(time()+"生产者 "+name+" 正在准备餐品...");
                    TimeUnit.SECONDS.sleep(3);
                    System.err.println(time()+"生产者 "+name+" 已出餐！");
                    queue.put(new Object());
                } catch (InterruptedException e) {
                    e.printStackTrace();
                    break;
                }
            }
        };
        Runnable consumer = () -> {
            while (true){
                try {
                    String name = Thread.currentThread().getName();
                    System.out.println(time()+"消费者 "+name+" 正在等待出餐...");
                    queue.take();
                    System.out.println(time()+"消费者 "+name+" 取到了餐品。");
                    TimeUnit.SECONDS.sleep(4);
                    System.out.println(time()+"消费者 "+name+" 已经将饭菜吃完了！");
                } catch (InterruptedException e) {
                    e.printStackTrace();
                    break;
                }
            }
        };
        for (int i = 0; i < 2; i++) new Thread(supplier, "Supplier-"+i).start();
        for (int i = 0; i < 3; i++) new Thread(consumer, "Consumer-"+i).start();
    }

    private static String time(){
        SimpleDateFormat format = new SimpleDateFormat("HH:mm:ss");
        return "["+format.format(new Date()) + "] ";
    }
}
```

可以看到，阻塞队列在多线程环境下的作用是非常明显的，算上ArrayBlockingQueue，一共有三种常用的阻塞队列：

- ArrayBlockingQueue：有界带缓冲阻塞队列（就是队列是有容量限制的，装满了肯定是不能再装的，只能阻塞，数组实现）
- SynchronousQueue：无缓冲阻塞队列（相当于没有容量的ArrayBlockingQueue，因此只有阻塞的情况）
- LinkedBlockingQueue：无界带缓冲阻塞队列（没有容量限制，也可以限制容量，也会阻塞，链表实现）

ArrayBlockingQueue构造方法：

```java
final ReentrantLock lock;

private final Condition notEmpty;

private final Condition notFull;

public ArrayBlockingQueue(int capacity, boolean fair) {
    if (capacity <= 0)
        throw new IllegalArgumentException();
    this.items = new Object[capacity];
    lock = new ReentrantLock(fair);   //底层采用锁机制保证线程安全性，这里我们可以选择使用公平锁或是非公平锁
    notEmpty = lock.newCondition();   //这里创建了两个Condition（都属于lock）一会用于入队和出队的线程阻塞控制
    notFull =  lock.newCondition();
}
```

`put`和`offer`方法：

```java
public boolean offer(E e) {
    checkNotNull(e);
    final ReentrantLock lock = this.lock;    //ReentrantLock进行加锁操作
    lock.lock();    //保证同一时间只有一个线程进入
    try {
        if (count == items.length)   //直接看看队列是否已满，如果没满则直接入队，如果已满则返回false
            return false;
        else {
            enqueue(e);
            return true;
        }
    } finally {
        lock.unlock();
    }
}

public void put(E e) throws InterruptedException {
    checkNotNull(e);
    final ReentrantLock lock = this.lock;    //同样的，需要进行加锁操作
    lock.lockInterruptibly();    //注意这里是可以响应中断的
    try {
        while (count == items.length)
            notFull.await();    //可以看到当队列已满时会直接挂起当前线程，在其他线程出队操作时会被唤醒
        enqueue(e);   //直到队列有空位才将线程入队
    } finally {
        lock.unlock();
    }
}
private E dequeue() {
    // assert lock.getHoldCount() == 1;
    // assert items[takeIndex] != null;
    final Object[] items = this.items;
    @SuppressWarnings("unchecked")
    E x = (E) items[takeIndex];
    items[takeIndex] = null;
    if (++takeIndex == items.length)
        takeIndex = 0;
    count--;
    if (itrs != null)
        itrs.elementDequeued();
    notFull.signal();    //出队操作会调用notFull的signal方法唤醒被挂起处于等待状态的线程
    return x;
}
```

出队操作：

```java
public E poll() {
    final ReentrantLock lock = this.lock;
    lock.lock();    //出队同样进行加锁操作，保证同一时间只能有一个线程执行
    try {
        return (count == 0) ? null : dequeue();   //如果队列不为空则出队，否则返回null
    } finally {
        lock.unlock();
    }
}

public E take() throws InterruptedException {
    final ReentrantLock lock = this.lock;
    lock.lockInterruptibly();    //可以响应中断进行加锁
    try {
        while (count == 0)
            notEmpty.await();    //和入队相反，也是一直等直到队列中有元素之后才可以出队，在入队时会唤醒此线程
        return dequeue();
    } finally {
        lock.unlock();
    }
}
private void enqueue(E x) {
    // assert lock.getHoldCount() == 1;
    // assert items[putIndex] == null;
    final Object[] items = this.items;
    items[putIndex] = x;
    if (++putIndex == items.length)
        putIndex = 0;
    count++;
    notEmpty.signal();    //对notEmpty的signal唤醒操作
}
```

#### 阻塞队列是如何实现阻塞和唤醒的？

**回答要点**：基于 **ReentrantLock + Condition** 实现
 **关键点**：

1. `await()` 释放锁，进入条件队列阻塞
2. 被 `signal()` 唤醒后，重新竞争锁
3. 获取锁后从 `await()` 返回，继续执行

#### 阻塞队列的核心方法

| 方法               | 队列满时       | 队列空时       | 说明             |
| ------------------ | -------------- | -------------- | ---------------- |
| **add()**          | 抛出异常       | 抛出异常       | 不推荐使用       |
| **remove()**       | 抛出异常       | 抛出异常       | 不推荐使用       |
| **offer()**        | 返回 false     | 返回 false     | 非阻塞，立即返回 |
| **poll()**         | 返回 null      | 返回 null      | 非阻塞，立即返回 |
| **put()**          | **阻塞**       | **阻塞**       | 会阻塞直到成功   |
| **take()**         | **阻塞**       | **阻塞**       | 会阻塞直到成功   |
| **offer(e, time)** | 超时返回 false | 超时返回 false | 超时阻塞         |
| **poll(time)**     | 超时返回 null  | 超时返回 null  | 超时阻塞         |

SynchronousQueue没有任何容量，正常情况下出队必须和入队操作成对出现，
 内部有一个抽象类Transferer，它定义了一个`transfer`方法，直接通过`transfer`方法来对生产者和消费者之间的数据进行传递。

**核心特点**：

- **容量为 0**：`isEmpty()` 永远返回 true，`size()` 永远返回 0
- **必须配对**：生产者和消费者必须同时准备好，否则阻塞
- **零缓冲**：直接传递，延迟最低
- **两种模式**：公平模式（队列，FIFO）、非公平模式（栈，LIFO）

**底层实现**：

- 公平模式：使用 **TransferQueue**（FIFO 队列）
- 非公平模式：使用 **TransferStack**（LIFO 栈）

#### 为什么 ArrayBlockingQueue 用一把锁，而 LinkedBlockingQueue 用两把锁？

**回答要点**：

**ArrayBlockingQueue 单锁原因**：

- 底层是**数组**，需要维护 `putIndex` 和 `takeIndex` 两个索引
- 入队和出队**可能修改同一个数组元素**，有数据竞争
- 必须保证**原子性**，防止 `count` 与索引不一致

**LinkedBlockingQueue 双锁原因**：

- 底层是**链表**，生产者和消费者操作**不同的节点**
- 生产者只操作 `last` 尾节点
- 消费者只操作 `head` 头节点
- 通过 **`AtomicInteger`** 维护 `count`，保证原子性

# 并发编程进阶

## 线程池

程序频繁地创建线程，由于线程的创建和销毁也需要占用系统资源，因此这样会降低我们整个程序的性能

可以将已创建的线程复用，利用池化技术，就像数据库连接池一样，可以创建很多个线程，然后反复地使用这些线程，而不对它们进行销毁。

Tomcat服务器，要在同一时间接受和处理大量的请求，那么就必须要在短时间内创建大量的线程，结束后又进行销毁，这显然会导致很大的开销，因此这种情况下使用线程池显然是更好的解决方案。

由于线程池可以反复利用已有线程执行多线程操作，所以它一般是有容量限制的，当所有的线程都处于工作状态时，那么新的多线程请求会被阻塞，直到有一个线程空闲出来为止，实际上这里就会用到阻塞队列。

**线程池解决的三个核心问题**

1. **降低资源消耗**：复用线程，避免频繁创建和销毁。
2. **提高响应速度**：任务来了，可以直接执行，不用等创建线程。
3. **便于管理**：线程是稀缺资源，无限制创建会导致系统崩溃

![image-20230306172249412](https://oss.itbaima.cn/internal/markdown/2023/03/06/ogcqAkahnWYByE2.png)

但是JUC提供的线程池肯定没有这么简单

### 线程池的使用

可以直接创建一个新的线程池对象，已经提前实现好了线程的调度机制

构造方法：

```java
public ThreadPoolExecutor(int corePoolSize,
                          int maximumPoolSize,
                          long keepAliveTime,
                          TimeUnit unit,
                          BlockingQueue<Runnable> workQueue,
                          ThreadFactory threadFactory,
                          RejectedExecutionHandler handler) {
    if (corePoolSize < 0 ||
        maximumPoolSize <= 0 ||
        maximumPoolSize < corePoolSize ||
        keepAliveTime < 0)
        throw new IllegalArgumentException();
    if (workQueue == null || threadFactory == null || handler == null)
        throw new NullPointerException();
    this.acc = System.getSecurityManager() == null ?
            null :
            AccessController.getContext();
    this.corePoolSize = corePoolSize;
    this.maximumPoolSize = maximumPoolSize;
    this.workQueue = workQueue;
    this.keepAliveTime = unit.toNanos(keepAliveTime);
    this.threadFactory = threadFactory;
    this.handler = handler;
}
```

- corePoolSize：**核心线程的数量**，这些线程会**一直存活**（即使空闲），除非设置了 `allowCoreThreadTimeOut(true)`。
- maximumPoolSize：**最大线程池大小**，当目前线程池中所有的线程都处于运行状态，并且等待队列已满，那么就会直接尝试继续创建新的`非核心线程`运行，但是不能超过最大线程池大小。
- keepAliveTime：**线程最大空闲时间**，当一个`非核心线程`空闲超过一定时间，会自动销毁。
- unit：**线程最大空闲时间的时间单位**
- workQueue：**线程等待队列**，当线程池中核心线程数已满时，就会将任务暂时存到等待队列中，直到有线程资源可用为止，这里可以使用我们上一章学到的阻塞队列。
- threadFactory：**线程创建工厂**，我们可以干涉线程池中线程的创建过程，进行自定义。
- handler：**拒绝策略**，当等待队列和线程池都没有空间了，真的不能再来新的任务时，来了个新的多线程任务，那么只能拒绝了，这时就会根据当前设定的拒绝策略进行处理。

最为重要的就是线程池大小的限定，合理地分配大小会使得线程池的执行效率事半功倍：

- 线程池执行任务的特性是CPU 密集型还是 IO 密集型
  - **CPU密集型：** 主要是执行计算任务，响应时间很快，CPU一直在运行，这种任务CPU的利用率很高，那么线程数应该是根据 CPU 核心数来决定，CPU 核心数 = 最大同时执行线程数，以 i5-9400F 处理器为例，CPU 核心数为 6，那么最多就能同时执行 6 个线程。
  - **IO密集型：** 主要是进行 IO 操作，因为执行 IO 操作的时间比较长，比如从硬盘读取数据之类的，CPU就得等着IO操作，很容易出现空闲状态，导致 CPU 的利用率不高，这种情况下可以适当增加线程池的大小，让更多的线程可以一起进行IO操作，一般可以配置为CPU核心数的2倍。

等待队列的容量为0，相当于没有容量，这个时候只能拒绝任务了

线程池的拒绝策略默认有以下几个：

- AbortPolicy(默认)：直接抛异常。
- CallerRunsPolicy：直接让提交任务的线程运行这个任务，比如在主线程向线程池提交了任务，那么就直接由主线程执行。
- DiscardOldestPolicy：丢弃队列中最近的一个任务，替换为当前任务。
- DiscardPolicy：什么也不用做。

```java
public static void main(String[] args) throws InterruptedException {
    ThreadPoolExecutor executor =
            new ThreadPoolExecutor(2, 4,
                    3, TimeUnit.SECONDS,
                    new SynchronousQueue<>(),
                    new ThreadPoolExecutor.CallerRunsPolicy());   //使用另一个构造方法，最后一个参数传入策略，比如这里使用了CallerRunsPolicy策略
```

当线程执行任务抛出异常时，该线程会被**销毁**，新任务会由**新创建的线程**执行（或复用其他存活线程）。但这取决于异常是否被捕获以及线程池的配置

官方也提供了很多的线程池定义，`Executors`工具类来快速创建线程池：

```java
public static void main(String[] args) throws InterruptedException {
    ExecutorService executor = Executors.newFixedThreadPool(2);   //直接创建一个固定容量的线程池
}
```

可以看到它的内部实现为：

```java
public static ExecutorService newFixedThreadPool(int nThreads) {
    return new ThreadPoolExecutor(nThreads, nThreads,
                                  0L, TimeUnit.MILLISECONDS,
                                  new LinkedBlockingQueue<Runnable>());
}
```

这里直接将最大线程和核心线程数量设定为一样的，并且等待时间为0，因为压根不需要，并且采用的是一个无界的LinkedBlockingQueue作为等待队列

使用newSingleThreadExecutor来创建只有一个线程的线程池：

```java
public static void main(String[] args) throws InterruptedException {
    ExecutorService executor = Executors.newSingleThreadExecutor();
    //创建一个只有一个线程的线程池
}
```

原理如下：

```java
public static ExecutorService newSingleThreadExecutor() {
    return new FinalizableDelegatedExecutorService
        (new ThreadPoolExecutor(1, 1,
                                0L, TimeUnit.MILLISECONDS,
                                new LinkedBlockingQueue<Runnable>()));
}
```

这里并不是直接创建的一个ThreadPoolExecutor对象，而是套了一层FinalizableDelegatedExecutorService

```java
static class FinalizableDelegatedExecutorService
    extends DelegatedExecutorService {
    FinalizableDelegatedExecutorService(ExecutorService executor) {
        super(executor);
    }
    protected void finalize() {    //在GC时，会执行finalize方法，此方法中会关闭掉线程池，释放资源
        super.shutdown();
    }
}
static class DelegatedExecutorService extends AbstractExecutorService {
    private final ExecutorService e;    //被委派对象
    DelegatedExecutorService(ExecutorService executor) { e = executor; }   //实际上所以的操作都是让委派对象执行的，有点像代理
    public void execute(Runnable command) { e.execute(command); }
    public void shutdown() { e.shutdown(); }
    public List<Runnable> shutdownNow() { return e.shutdownNow(); }
```

下面两种写法的区别在于：

```java
public static void main(String[] args) throws InterruptedException {
    ExecutorService executor1 = Executors.newSingleThreadExecutor();
    ExecutorService executor2 = Executors.newFixedThreadPool(1);
}
```

前者实际上是被代理了，没办法直接修改前者的相关属性，显然使用前者创建只有一个线程的线程池更加专业和安全（可以防止属性被修改）一些

`newCachedThreadPool`方法：

```java
public static void main(String[] args) throws InterruptedException {
    ExecutorService executor = Executors.newCachedThreadPool();
    //它是一个会根据需要无限制创建新线程的线程池
}
```

它的实现：

```java
public static ExecutorService newCachedThreadPool() {
    return new ThreadPoolExecutor(0, Integer.MAX_VALUE,
                                  60L, TimeUnit.SECONDS,
                                  new SynchronousQueue<Runnable>());
}
```

可以看到，核心线程数为0，那么也就是说所有的线程都是`非核心线程`，也就是说线程空闲时间超过1秒钟，一律销毁。但是它的最大容量是`Integer.MAX_VALUE`，也就是说，它可以无限制地增长下去，所以这玩意要慎用

### 执行带返回值的任务

可以使用到Future，它可以返回任务的计算结果，通过它来获取任务的结果以及任务当前是否完成

```java
		ExecutorService executor = Executors.newFixedThreadPool(5);
		// 方式1：使用 Callable
        Future<String> future = executor.submit(() -> {
            Thread.sleep(2000);
            return "任务执行结果";
        });
        
        // 方式2：使用 Runnable + 返回值
        Future<String> future2 = executor.submit(() -> {
            System.out.println("Runnable 执行");
        }, "固定返回值");
```

#### Runnable vs Callable

| 对比项       | Runnable              | Callable             |
| ------------ | --------------------- | -------------------- |
| **包路径**   | java.lang             | java.util.concurrent |
| **方法**     | `void run()`          | `V call()`           |
| **返回值**   | 无                    | 有（泛型）           |
| **异常**     | 不能抛出 checked 异常 | 可以抛出任何异常     |
| **使用场景** | 不需要返回结果        | 需要返回结果         |

```java
Future<String> future = executor.submit(callable);

// 1. 获取结果（阻塞）
String result = future.get();  // 无限等待

// 2. 带超时的获取
String result = future.get(3, TimeUnit.SECONDS);  // 等待3秒

// 3. 检查是否完成
boolean done = future.isDone();

// 4. 检查是否取消
boolean cancelled = future.isCancelled();

// 5. 取消任务
boolean cancel = future.cancel(true);  // true: 中断正在执行的任务
```

### 执行定时任务

Timer和TimerTask会创建一个线程处理定时任务，无法实现多线程调度，并且它无法处理异常情况一旦抛出未捕获异常那么会直接终止

JDK5之后，ScheduledThreadPoolExecutor可以提交定时任务，它继承自ThreadPoolExecutor，并且所有的构造方法都必须要求最大线程池容量为Integer.MAX_VALUE，并且都是采用的DelayedWorkQueue作为等待队列

```java
public ScheduledThreadPoolExecutor(int corePoolSize) {
    super(corePoolSize, Integer.MAX_VALUE, 0, NANOSECONDS,
          new DelayedWorkQueue());
}

public ScheduledThreadPoolExecutor(int corePoolSize,
                                   ThreadFactory threadFactory) {
    super(corePoolSize, Integer.MAX_VALUE, 0, NANOSECONDS,
          new DelayedWorkQueue(), threadFactory);
}

public ScheduledThreadPoolExecutor(int corePoolSize,
                                   RejectedExecutionHandler handler) {
    super(corePoolSize, Integer.MAX_VALUE, 0, NANOSECONDS,
          new DelayedWorkQueue(), handler);
}

public ScheduledThreadPoolExecutor(int corePoolSize,
                                   ThreadFactory threadFactory,
                                   RejectedExecutionHandler handler) {
    super(corePoolSize, Integer.MAX_VALUE, 0, NANOSECONDS,
          new DelayedWorkQueue(), threadFactory, handler);
}
```

这个方法可以提交一个延时任务，只有到达指定时间之后才会开始：

```java
public static void main(String[] args) throws ExecutionException, InterruptedException {
  	// 直接设定核心线程数为1
    ScheduledThreadPoolExecutor executor = new ScheduledThreadPoolExecutor(1);
    // 计划在3秒后执行
    executor.schedule(() -> System.out.println("HelloWorld!"), 3, TimeUnit.SECONDS);

    executor.shutdown();
}
```

传入一个Callable对象，用于接收返回值：

```java
public static void main(String[] args) throws ExecutionException, InterruptedException {
    ScheduledThreadPoolExecutor executor = new ScheduledThreadPoolExecutor(2);
  	//这里使用ScheduledFuture
    ScheduledFuture<String> future = executor.schedule(() -> "????", 3, TimeUnit.SECONDS);
    System.out.println("任务剩余等待时间："+future.getDelay(TimeUnit.MILLISECONDS) / 1000.0 + "s");
    System.out.println("任务执行结果："+future.get());
    executor.shutdown();
```

按照一定的频率不断执行任务:

```java
public static void main(String[] args) throws ExecutionException, InterruptedException {
    ScheduledThreadPoolExecutor executor = new ScheduledThreadPoolExecutor(2);
    executor.scheduleAtFixedRate(() -> System.out.println("Hello World!"),
            3, 1, TimeUnit.SECONDS);
  	// 三秒钟延迟开始，之后每隔一秒钟执行一次
}
```

Executors也预置了newScheduledThreadPool方法用于创建线程池：

```java
public static void main(String[] args) throws ExecutionException, InterruptedException {
    ScheduledExecutorService service = Executors.newScheduledThreadPool(1);
    service.schedule(() -> System.out.println("Hello World!"), 1, TimeUnit.SECONDS);
}
```

### 线程池实现原理

ctl变量：

```java
//这个变量比较关键，用到了原子AtomicInteger，用于同时保存线程池运行状态和线程数量（使用原子类是为了保证原子性）
//它是通过拆分32个bit位来保存数据的，前3位保存状态，后29位保存工作线程数量（那要是工作线程数量29位装不下不就GG？）
private final AtomicInteger ctl = new AtomicInteger(ctlOf(RUNNING, 0));
private static final int COUNT_BITS = Integer.SIZE - 3;    //29位，线程数量位
private static final int CAPACITY   = (1 << COUNT_BITS) - 1;   //计算得出最大容量（1左移29位，最大容量为2的29次方-1）

// 所有的运行状态，注意都是只占用前3位，不会占用后29位
// 接收新任务，并等待执行队列中的任务
private static final int RUNNING    = -1 << COUNT_BITS;   //111 | 0000... (后29数量位，下同)
// 不接收新任务，但是依然等待执行队列中的任务
private static final int SHUTDOWN   =  0 << COUNT_BITS;   //000 | 数量位
// 不接收新任务，也不执行队列中的任务，并且还要中断正在执行中的任务
private static final int STOP       =  1 << COUNT_BITS;   //001 | 数量位
// 所有的任务都已结束，线程数量为0，即将完全关闭
private static final int TIDYING    =  2 << COUNT_BITS;   //010 | 数量位
// 完全关闭
private static final int TERMINATED =  3 << COUNT_BITS;   //011 | 数量位

// 封装和解析ctl变量的一些方法
private static int runStateOf(int c)     { return c & ~CAPACITY; }   //对CAPACITY取反就是后29位全部为0，前三位全部为1，接着与c进行与运算，这样就可以只得到前三位的结果了，所以这里是取运行状态
private static int workerCountOf(int c)  { return c & CAPACITY; }
//同上，这里是为了得到后29位的结果，所以这里是取线程数量
private static int ctlOf(int rs, int wc) { return rs | wc; }   
// 比如上面的RUNNING, 0，进行与运算之后：
// 111 | 0000000000000000000000000
```

![image-20230306172347411](https://oss.itbaima.cn/internal/markdown/2023/03/06/yoFvxQJq84G6dcH.png)

，看看在调用`execute`方法之后，线程池会做些什么：

```java
//这个就是我们指定的阻塞队列
private final BlockingQueue<Runnable> workQueue;

//再次提醒，这里没加锁！！该有什么意识不用我说了吧，所以说ctl才会使用原子类。
public void execute(Runnable command) {
    if (command == null)
        throw new NullPointerException();     //如果任务为null，那执行个寂寞，所以说直接空指针
    int c = ctl.get();      //获取ctl的值，一会要读取信息的
    if (workerCountOf(c) < corePoolSize) {   //判断工作线程数量是否小于核心线程数
        if (addWorker(command, true))    //如果是，那不管三七二十一，直接加新的线程执行，然后返回即可
            return;
        c = ctl.get();    //如果线程添加失败（有可能其他线程也在对线程池进行操作），那就更新一下c的值
    }
    if (isRunning(c) && workQueue.offer(command)) {   //继续判断，如果当前线程池是运行状态，那就尝试向阻塞队列中添加一个新的等待任务
        int recheck = ctl.get();   //再次获取ctl的值
        if (! isRunning(recheck) && remove(command))   //这里是再次确认当前线程池是否关闭，如果添加等待任务后线程池关闭了，那就把刚刚加进去任务的又拿出来
            reject(command);   //然后直接拒绝当前任务的提交（会根据我们的拒绝策略决定如何进行拒绝操作）
        else if (workerCountOf(recheck) == 0)   //如果这个时候线程池依然在运行状态，那么就检查一下当前工作线程数是否为0，如果是那就直接添加新线程执行
            addWorker(null, false);   //添加一个新的非核心线程，但是注意没添加任务
      	//其他情况就啥也不用做了
    }
    else if (!addWorker(command, false))   //这种情况要么就是线程池没有运行，要么就是队列满了，按照我们之前的规则，核心线程数已满且队列已满，那么会直接添加新的非核心线程，但是如果已经添加到最大数量，这里肯定是会失败的
        reject(command);   //确实装不下了，只能拒绝
}
```

`addWorker`是怎么创建和执行任务的，又是一大堆代码：

```java
private boolean addWorker(Runnable firstTask, boolean core) {
  	//这里给最外层循环打了个标签，方便一会的跳转操作
    retry:
    for (;;) {    //无限循环，老套路了，注意这里全程没加锁
        int c = ctl.get();     //获取ctl值
        int rs = runStateOf(c);    //解析当前的运行状态

        // Check if queue empty only if necessary.
        if (rs >= SHUTDOWN &&   //判断线程池是否不是处于运行状态
            ! (rs == SHUTDOWN &&   //如果不是运行状态，判断线程是SHUTDOWN状态并、任务不为null、等待队列不为空，只要有其中一者不满足，直接返回false，添加失败
               firstTask == null &&   
               ! workQueue.isEmpty()))
            return false;

        for (;;) {   //内层又一轮无限循环，这个循环是为了将线程计数增加，然后才可以真正地添加一个新的线程
            int wc = workerCountOf(c);    //解析当前的工作线程数量
            if (wc >= CAPACITY ||
                wc >= (core ? corePoolSize : maximumPoolSize))    //判断一下还装得下不，如果装得下，看看是核心线程还是非核心线程，如果是核心线程，不能大于核心线程数的限制，如果是非核心线程，不能大于最大线程数限制
                return false;
            if (compareAndIncrementWorkerCount(c))    //CAS自增线程计数，如果增加成功，任务完成，直接跳出继续
                break retry;    //注意这里要直接跳出最外层循环，所以用到了标签（类似于goto语句）
            c = ctl.get();  // 如果CAS失败，更新一下c的值
            if (runStateOf(c) != rs)    //如果CAS失败的原因是因为线程池状态和一开始的不一样了，那么就重新从外层循环再来一次
                continue retry;    //注意这里要直接从最外层循环继续，所以用到了标签（类似于goto语句）
            // 如果是其他原因导致的CAS失败，那只可能是其他线程同时在自增，所以重新再来一次内层循环
        }
    }

  	//好了，线程计数自增也完了，接着就是添加新的工作线程了
    boolean workerStarted = false;   //工作线程是否已启动
    boolean workerAdded = false;    //工作线程是否已添加
    Worker w = null;     //暂时理解为工作线程，别急，我们之后会解读Worker类
    try {
        w = new Worker(firstTask);     //创建新的工作线程，传入我们提交的任务
        final Thread t = w.thread;    //拿到工作线程中封装的Thread对象
        if (t != null) {      //如果线程不为null，那就可以安排干活了
            final ReentrantLock mainLock = this.mainLock;      //又是ReentrantLock加锁环节，这里开始就是只有一个线程能进入了
            mainLock.lock();
            try {
                // Recheck while holding lock.
                // Back out on ThreadFactory failure or if
                // shut down before lock acquired.
                int rs = runStateOf(ctl.get());    //获取当前线程的运行状态

                if (rs < SHUTDOWN ||
                    (rs == SHUTDOWN && firstTask == null)) {    //只有当前线程池是正在运行状态，或是SHUTDOWN状态且firstTask为空，那么就继续
                    if (t.isAlive()) // 检查一下线程是否正在运行状态
                        throw new IllegalThreadStateException();   //如果是那肯定是不能运行我们的任务的
                    workers.add(w);    //直接将新创建的Work丢进 workers 集合中
                    int s = workers.size();   //看看当前workers的大小
                    if (s > largestPoolSize)   //这里是记录线程池运行以来，历史上的最多线程数
                        largestPoolSize = s;
                    workerAdded = true;   //工作线程已添加
                }
            } finally {
                mainLock.unlock();   //解锁
            }
            if (workerAdded) {
                t.start();   //启动线程
                workerStarted = true;  //工作线程已启动
            }
        }
    } finally {
        if (! workerStarted)    //如果线程在上面的启动过程中失败了
            addWorkerFailed(w);    //将w移出workers并将计数器-1，最后如果线程池是终止状态，会尝试加速终止线程池
    }
    return workerStarted;   //返回是否成功
}
```

Worker类是如何实现的，它继承自AbstractQueuedSynchronizer，时隔两章，居然再次遇到AQS，那也就是说，它本身就是一把锁：

```java
private final class Worker
    extends AbstractQueuedSynchronizer
    implements Runnable {
    //用来干活的线程
    final Thread thread;
    //要执行的第一个任务，构造时就确定了的
    Runnable firstTask;
    //干活数量计数器，也就是这个线程完成了多少个任务
    volatile long completedTasks;

    Worker(Runnable firstTask) {
        setState(-1); // 执行Task之前不让中断，将AQS的state设定为-1
        this.firstTask = firstTask;
        this.thread = getThreadFactory().newThread(this);   //通过预定义或是我们自定义的线程工厂创建线程
    }
  
    public void run() {
        runWorker(this);   //真正开始干活，包括当前活干完了又要等新的活来，就从这里开始，一会详细介绍
    }

   	//0就是没加锁，1就是已加锁
    protected boolean isHeldExclusively() {
        return getState() != 0;
    }

    ...
}
```

Worker到底是怎么在进行任务的：

```java
final void runWorker(Worker w) {
    Thread wt = Thread.currentThread();   //获取当前线程
    Runnable task = w.firstTask;    //取出要执行的任务
    w.firstTask = null;   //然后把Worker中的任务设定为null
    w.unlock(); // 因为一开始为-1，这里是通过unlock操作将其修改回0，只有state大于等于0才能响应中断
    boolean completedAbruptly = true;
    try {
      	//只要任务不为null，或是任务为空但是可以从等待队列中取出任务不为空，那么就开始执行这个任务，注意这里是无限循环，也就是说如果当前没有任务了，那么会在getTask方法中卡住，因为要从阻塞队列中等着取任务
        while (task != null || (task = getTask()) != null) {
            w.lock();    //对当前Worker加锁，这里其实并不是防其他线程，而是在shutdown时保护此任务的运行
            
          //由于线程池在STOP状态及以上会禁止新线程加入并且中断正在进行的线程
            if ((runStateAtLeast(ctl.get(), STOP) ||   //只要线程池是STOP及以上的状态，那肯定是不能开始新任务的
                 (Thread.interrupted() &&    					 //线程是否已经被打上中断标记并且线程一定是STOP及以上
                  runStateAtLeast(ctl.get(), STOP))) &&
                !wt.isInterrupted())   //再次确保线程被没有打上中断标记
                wt.interrupt();     //打中断标记
            try {
                beforeExecute(wt, task);  //开始之前的准备工作，这里暂时没有实现
                Throwable thrown = null;
                try {
                    task.run();    //OK，开始执行任务
                } catch (RuntimeException x) {
                    thrown = x; throw x;
                } catch (Error x) {
                    thrown = x; throw x;
                } catch (Throwable x) {
                    thrown = x; throw new Error(x);
                } finally {
                    afterExecute(task, thrown);    //执行之后的工作，也没实现
                }
            } finally {
                task = null;    //任务已完成，不需要了
                w.completedTasks++;   //任务完成数++
                w.unlock();    //解锁
            }
        }
        completedAbruptly = false;
    } finally {
      	//如果能走到这一步，那说明上面的循环肯定是跳出了，也就是说这个Worker可以丢弃了
      	//所以这里会直接将 Worker 从 workers 里删除掉
        processWorkerExit(w, completedAbruptly);
    }
}
```

那么它是怎么从阻塞队列里面获取任务的呢：

```java
private Runnable getTask() {
    boolean timedOut = false; // Did the last poll() time out?

    for (;;) {    //无限循环获取
        int c = ctl.get();   //获取ctl 
        int rs = runStateOf(c);      //解析线程池运行状态

        // Check if queue empty only if necessary.
        if (rs >= SHUTDOWN && (rs >= STOP || workQueue.isEmpty())) {      //判断是不是没有必要再执行等待队列中的任务了，也就是处于关闭线程池的状态了
            decrementWorkerCount();     //直接减少一个工作线程数量
            return null;    //返回null，这样上面的runWorker就直接结束了，下同
        }

        int wc = workerCountOf(c);   //如果线程池运行正常，那就获取当前的工作线程数量

        // Are workers subject to culling?
        boolean timed = allowCoreThreadTimeOut || wc > corePoolSize;   //如果线程数大于核心线程数或是允许核心线程等待超时，那么就标记为可超时的

      	//超时或maximumPoolSize在运行期间被修改了，并且线程数大于1或等待队列为空，那也是不能获取到任务的
        if ((wc > maximumPoolSize || (timed && timedOut))
            && (wc > 1 || workQueue.isEmpty())) {
            if (compareAndDecrementWorkerCount(c))   //如果CAS减少工作线程成功
                return null;    //返回null
            continue;   //否则开下一轮循环
        }

        try {
            Runnable r = timed ?
                workQueue.poll(keepAliveTime, TimeUnit.NANOSECONDS) :   //如果可超时，那么最多等到超时时间
                workQueue.take();    //如果不可超时，那就一直等着拿任务
            if (r != null)    //如果成功拿到任务，ok，返回
                return r;
            timedOut = true;   //否则就是超时了，下一轮循环将直接返回null
        } catch (InterruptedException retry) {
            timedOut = false;
        }
      	//开下一轮循环吧
    }
}
```

有关`execute()`方法的源码解读，就先到这里。

线程池关闭时会做什么事情：

```java
//普通的shutdown会继续将等待队列中的线程执行完成后再关闭线程池
public void shutdown() {
    final ReentrantLock mainLock = this.mainLock;
    mainLock.lock();
    try {
      	//判断是否有权限终止
        checkShutdownAccess();
      	//CAS将线程池运行状态改为SHUTDOWN状态，还算比较温柔，详细过程看下面
        advanceRunState(SHUTDOWN);
       	//让闲着的线程（比如正在等新的任务）中断，但是并不会影响正在运行的线程，详细过程请看下面
        interruptIdleWorkers();
        onShutdown(); //给ScheduledThreadPoolExecutor提供的钩子方法，就是等ScheduledThreadPoolExecutor去实现的，当前类没有实现
    } finally {
        mainLock.unlock();
    }
    tryTerminate();   //最后尝试终止线程池
}
private void advanceRunState(int targetState) {
    for (;;) {
        int c = ctl.get();    //获取ctl
        if (runStateAtLeast(c, targetState) ||    //是否大于等于指定的状态
            ctl.compareAndSet(c, ctlOf(targetState, workerCountOf(c))))   //CAS设置ctl的值
            break;   //任意一个条件OK就可以结束了
    }
}
private void interruptIdleWorkers(boolean onlyOne) {
    final ReentrantLock mainLock = this.mainLock;
    mainLock.lock();
    try {
        for (Worker w : workers) {
            Thread t = w.thread;    //拿到Worker中的线程
            if (!t.isInterrupted() && w.tryLock()) {   //先判断一下线程是不是没有被中断然后尝试加锁，但是通过前面的runWorker()源代码我们得知，开始之后是让Worker加了锁的，所以如果线程还在执行任务，那么这里肯定会false
                try {
                    t.interrupt();    //如果走到这里，那么说明线程肯定是一个闲着的线程，直接给中断吧
                } catch (SecurityException ignore) {
                } finally {
                    w.unlock();    //解锁
                }
            }
            if (onlyOne)   //如果只针对一个Worker，那么就结束循环
                break;
        }
    } finally {
        mainLock.unlock();
    }
}
```

而`shutdownNow()`方法也差不多，但是这里会更直接一些：

```java
//shutdownNow开始后，不仅不允许新的任务到来，也不会再执行等待队列的线程，而且会终止正在执行的线程
public List<Runnable> shutdownNow() {
    List<Runnable> tasks;
    final ReentrantLock mainLock = this.mainLock;
    mainLock.lock();
    try {
        checkShutdownAccess();
      	//这里就是直接设定为STOP状态了，不再像shutdown那么温柔
        advanceRunState(STOP);
      	//直接中断所有工作线程，详细过程看下面
        interruptWorkers();
      	//取出仍处于阻塞队列中的线程
        tasks = drainQueue();
    } finally {
        mainLock.unlock();
    }
    tryTerminate();
    return tasks;   //最后返回还没开始的任务
}
private void interruptWorkers() {
    final ReentrantLock mainLock = this.mainLock;
    mainLock.lock();
    try {
        for (Worker w : workers)   //遍历所有Worker
            w.interruptIfStarted();   //无差别对待，一律加中断标记
    } finally {
        mainLock.unlock();
    }
}
```

`tryTerminate()`是怎么完完全全终止掉一个线程池的：

```java
final void tryTerminate() {
    for (;;) {     //无限循环
        int c = ctl.get();    //上来先获取一下ctl值
      	//只要是正在运行 或是 线程池基本上关闭了 或是 处于SHUTDOWN状态且工作队列不为空，那么这时还不能关闭线程池，返回
        if (isRunning(c) ||
            runStateAtLeast(c, TIDYING) ||
            (runStateOf(c) == SHUTDOWN && ! workQueue.isEmpty()))
            return;
      
      	//走到这里，要么处于SHUTDOWN状态且等待队列为空或是STOP状态
        if (workerCountOf(c) != 0) { // 如果工作线程数不是0，这里也会中断空闲状态下的线程
            interruptIdleWorkers(ONLY_ONE);   //这里最多只中断一个空闲线程，然后返回
            return;
        }

      	//走到这里，工作线程也为空了，可以终止线程池了
        final ReentrantLock mainLock = this.mainLock;
        mainLock.lock();
        try {
            if (ctl.compareAndSet(c, ctlOf(TIDYING, 0))) {   //先CAS将状态设定为TIDYING表示基本终止，正在做最后的操作
                try {
                    terminated();   //终止，暂时没有实现
                } finally {
                    ctl.set(ctlOf(TERMINATED, 0));   //最后将状态设定为TERMINATED，线程池结束了它年轻的生命
                    termination.signalAll();    //如果有线程调用了awaitTermination方法，会等待当前线程池终止，到这里差不多就可以唤醒了
                }
                return;   //结束
            }
          	//注意如果CAS失败会直接进下一轮循环重新判断
        } finally {
            mainLock.unlock();
        }
        // else retry on failed CAS
    }
}
```

关于更高级的定时任务线程池不做讲解

------

## 并发工具类
