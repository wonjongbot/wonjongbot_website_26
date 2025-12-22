---
title: "Unix-like Kernel"
year: 2023
description: "Unix-like kernel with vmem, syscalls, and multithreading."
image: "/images/projects/kernel/os_small.gif"
link: "https://github.com/wonjongbot/391OS"
demo: "./kernel"
---

ECE 391 final MP. Unix like kernel w/ vmem, syscall, multithreading and more.

# Unix-like Kernel

<!-- embed-kernel placeholder -->

## Technical Overview

Contents

- [Technical Overview](#technical-overview)
  - [Shell Commands](#shell-commands)
  - [Shell Shortcut Keys](#shell-shortcut-keys)
  - [File System](#file-system)
  - [Exception and Exception Handlers](#exception-and-exception-handlers)
  - [Interrupt and Interrupt Handlers](#interrupt-and-interrupt-handlers)
  - [Supported Devices and Drivers](#supported-devices-and-drivers)
  - [Memory Addressing](#memory-addressing)
  - [Physical Memory Layout](#physical-memory-layout)
  - [Virtual Memory Layout](#virtual-memory-layout)
  - [System Calls](#system-calls)
  - [Process Control/Execute/Halt](#process-controlexecutehalt)
    - [Process Creation: Execute System Call](#process-creation-execute-system-call)
    - [Process Termination: Halt System Call](#process-termination-halt-system-call)
  - [Process Switching/Scheduler](#process-switchingscheduler)
    - [Process Switching Mechanism](#process-switching-mechanism)
  - [Background Switching and Multiterminals](#background-switching-and-multiterminals)
    - [Handling Background Process Switching](#handling-background-process-switching)
    - [Handling Active Process Switching](#handling-active-process-switching)

### Shell Commands

| Command | Description |
| --- | --- |
| exit | Terminates the current shell instance. If the exited process is the root shell, a new instance is spawned. |
| \[Executable\] \[Arg\] | Searches for and executes the specified program in the current terminal. Some programs may require additional arguments (see [File System Directory](#file-system-directory)). |

### Shell Shortcut Keys

| Combination | Action | Description |
| --- | --- | --- |
| Alt+F1 | Switch to Terminal 1 | (See [Background Switching and Multiterminals](#background-switching-and-multiterminals)) |
| Alt+F2 | Switch to Terminal 2 | (See [Background Switching and Multiterminals](#background-switching-and-multiterminals)) |
| Alt+F3 | Switch to Terminal 3 | (See [Background Switching and Multiterminals](#background-switching-and-multiterminals)) |
| Ctrl+L | Clear Screen | Clears the video memory and resets the cursor position. |

### File System

The file system is **read-only** and has a total size of **8MB**, organized into **4KB blocks** consisting of a **boot block, inodes, and data blocks**.

- The **boot block** can track up to **62 inodes** and contains the **root directory**.
- Each **inode** can reference up to **1023 data blocks**.
- Thus the file system supports a **maximum of 62 files**, each with a maximum **size of 4092KB** and a **filename limit of 32 characters**.
- The file system is **flat** (non-hierarchical) and **does not support writing or modifications**.

### Exception and Exception Handlers

An exception occurs when a user program (or worse, the kernel) attempts an illegal or undefined operation (e.g., division by zero, accessing invalid memory). However, an exception is not necessarily "unexpected"; it simply means execution has deviated from the normal control flow.

Exceptions are **synchronous** events, meaning they occur as a direct result of instruction execution. When an exception is triggered, the processor jumps to a predefined assembly linkage (see [Context Switching and Assembly Linkages](#context-switching-and-assembly-linkages)), which then invokes the unified exception handler.

The exception handler typically logs an error message and debugging information. _(In modern kernels, if the exception is recoverable, the process receives a signal, allowing it to handle the error. However, our OS does not support signals.)_ If no handler is installed, the default behavior is to terminate the offending process.

If an exception occurs in **kernel mode**, it is considered fatal and non-recoverable. In this case, the kernel halts execution, requiring a system reboot.

### Interrupt and Interrupt Handlers

An interrupt occurs when a hardware device requires the processor’s attention, such as keyboard input, the Real-Time Clock (RTC), or the Programmable Interrupt Controller (PIC). From the kernel’s perspective, interrupts are **unexpected and unpredictable** since they can occur at any time (and typically unrelated) relative to program execution.

The OS includes only essential device drivers (see [Supported Devices and Drivers](#supported-devices-and-drivers)). The remaining interrupt Request (IRQ) lines are masked and ignored unless explicitly enabled.

The IRQ lines are managed by **two cascaded Intel 8259 PICs**, following the standard IBM-compatible PC architecture.

Interrupts are **asynchronous**, meaning they are triggered independently of the program flow. When an interrupt occurs and the processor is notified, the CPU jumps to the appropriate assembly linkage (see [Context Switching and Assembly Linkages](#context-switching-and-assembly-linkages)).

The interrupt assembly linkage **saves the processor state**, then invokes the unified interrupt handler.

The interrupt handler identifies the source of the interrupt and calls the appropriate device driver, which then performs the necessary processing before execution resumes (see [Supported Devices and Drivers](#supported-devices-and-drivers)).

### Supported Devices and Drivers

The kernel includes drivers for the **keyboard, Programmable Interval Timer (PIT), Real-Time Clock (RTC), and terminal**.

The **keyboard, PIT, and RTC drivers** interact with physical devices and include handlers for their respective interrupts (see [Interrupts and Interrupt Handlers](#interrupts-and-interrupt-handlers)).

- The **keyboard driver** handles key presses, including uppercase/lowercase typing and combination keys.
- The **PIT and RTC generate periodic interrupts**, each serving different roles in system operation.
- The **PIT driver** is responsible for **process scheduling** and cannot be accessed by user programs (see [Process Switching and Scheduler](#process-switching-and-scheduler)).
- The **RTC driver** is **user-accessible** and is **virtualized per process**, meaning each process perceives its own independent RTC instance and frequency.

_This design ensures that only the kernel controls the PIT frequency, preventing user programs from tampering with the scheduler._

The **terminal driver** is for **standard I/O operations**, acting as a bridge between user processes, devices, and the kernel.

The system supports **three virtual terminals** (see [Background Switching and Multiterminals](#background-switching-and-multiterminals)). Each terminal maintains a separate **input buffer**, limited to **128 characters**.

### Memory Addressing

The kernel **bypasses segmentation**, similar to most modern operating systems, relying solely on **paging** for memory management.

**Paging** is used exclusively for memory addressing.

The memory layout is **fixed and predefined** (see [Physical Memory Layout](#physical-memory-layout) and [Virtual Memory Layout](#virtual-memory-layout)).

### Physical Memory Layout

From low to high, the kernel utilizes the following 32MB physical memory:  

*   4MB space with five 4KB space for the VRAM for the active terminal, 3 terminal backups, and an extra backup space (see [Multiterminals](#background-switchingmultiterminals))
*   4MB space for the kernel data (mostly Process Control Blocks (PCBs) and Terminal Info (TI) blocks) and kernel stack (see [Process Control](#process-controlexecutehalt) and [Multiterminals](#background-switchingmultiterminals))
*   Six 4MB spaces for user applications' binary and stack (see [Process Control](#process-controlexecutehalt))

### Virtual Memory Layout

The kernel maps a **4GB virtual address space** for each user program. The memory layout, from low to high, consists of:

- **4MB managed by a supervisor Page Table (PT)**, including five **4KB supervisor pages**, mapped to physical memory (see [Physical Memory Layout](#physical-memory-layout)).
- **4MB supervisor jumbo page for the kernel**, mapped directly to physical memory (see [Physical Memory Layout](#physical-memory-layout)).
- **4MB user page at virtual address 128MB**, allocated for the **currently running user program** (see [Process Control](#process-control-execute-and-halt)).
- **4MB managed by a user PT**, including a **4KB vidmap page**, granting user-space access to the video buffer for the active program (see [System Calls](#system-calls) and [Multiterminals](#background-switching-and-multiterminals)).

### System Calls


| System Call | Description |
| --- | --- |
| **halt** | Terminates the current program (process). For details, see [Process Control: Execute and Halt](#process-control-execute-and-halt). |
| **execute** | Loads and executes a new program. For details, see [Process Control: Execute and Halt](#process-control-execute-and-halt). |
| **read** | Reads data from an open file (see [File System Abstraction](#file-system-abstraction)). |
| **write** | Writes data to a file (supported for terminal and RTC devices only). |
| **open** | Allocates a file descriptor (FD) entry and opens a file. |
| **close** | Closes an open file descriptor (FD) and releases associated resources. |
| **getargs** | Retrieves the command-line arguments for the current process, extracted during the `execute` system call. |
| **vidmap** | Maps the video memory to a user-accessible virtual address. |

System calls are triggered explicitly by user programs through a **software interrupt** (`INT 0x80` on x86 systems).

When a system call is invoked, the processor jumps to the **system call assembly linkage** (see [Context Switching and Assembly Linkages](#context-switching-and-assembly-linkages)).

Arguments for system calls are passed through the **%EAX, %EBX, %ECX, and %EDX registers**.

The assembly linkage validates the arguments before invoking the corresponding system call handler

### Process Control/Execute/Halt

The kernel supports up to **six concurrent processes**. In **kernel space**, each process maintains a **kernel stack** and a **Process Control Block (PCB)**.

In **user space**, each process has its own **dedicated user page** (see [Virtual Memory Layout](#virtual-memory-layout)), which contains the **executable binary and a user stack**.

By maintaining separate **kernel and user stacks**, processes won't overwrite each other’s execution context.

Each **PCB** tracks:
- **Process ID (PID)**
- **Parent PID**
- **Terminal ID**
- **Kernel and user stack pointers**
- **File descriptors (FDs)**
- Other process-specific information

#### Process Creation: Execute System Call

When **creating a new process** via the `execute` system call (see [System Calls](#system-calls)), the OS follows these steps:

1. **Sanity checks** – Validates the program binary and extracts arguments.
2. **Allocate PCB** – Assigns a free PCB slot for the new process.
3. **Set up user page** – Allocates and maps the new process’s address space.
4. **Load program binary** – Copies the executable into memory.
5. **Initialize FDs** – Sets up file descriptors.
6. **Bookkeeping** – Tracks parent-child process ids to allow process return on exit.
7. **Context switch setup** – Sets up hardware context with the new **PC** and **user stack**.
8. **Jump to execution** – Returns to the assembly linkage to perform the context switch (see [Context Switching and Assembly Linkages](#context-switching-and-assembly-linkages)).

#### Process Termination: Halt System Call

When **a process is halted** via the `halt` system call (see [System Calls](#system-calls)), the OS:

1. **Frees allocated resources** – Releases memory pages, vidmap, and file descriptors.
2. **Deallocates PCB** – Each process has PCB slots preallocated (based on process ID).
3. **Restores parent process context** – Retrieves the parent’s execution state.
4. **Performs context switch back to parent** – Gives control back to the parent process via the assembly linkage.

### Process Switching/Scheduler

The kernel uses a **round-robin scheduler**, triggered by **PIT (Programmable Interval Timer) interrupts** (see [Supported Devices and Drivers](#supported-devices-and-drivers)).

Although the system supports **up to six concurrent processes**, only **three are actively scheduled**, with **one process executing at a time**. The remaining two scheduled processes are **paused until the scheduler reactivates them**.

The scheduler assigns **one active process per terminal**, continuously cycling through them to enable multitasking. However, since the kernel is designed for a **uniprocessor system**, only **one process is actually running** at any given moment.

#### Process Switching Mechanism

When switching between processes, the **kernel saves the current process's hardware context**. This is similar to the `halt` system call but **preserves all process state and resources**.

1. **Save current process state** – Registers, stack pointer, and page table mappings are stored.
2. **Select the next scheduled process** – Based on the round-robin scheme.
3. **Switch memory context** – Kernel page directory and stack are updated to point to the new process.
4. **Restore the next process state** – Registers and stack are restored from the saved context.
5. **Resume execution** – The kernel returns to the system linkage (see [Context Switching and Assembly Linkages](#context-switching-and-assembly-linkages)).

### Background Switching and Multiterminals

As mentioned above, the OS supports **up to three active terminals**, each maintaining information about the **currently running process**, **PCB pointer**, and **screen state**. The **scheduler relies on this information** to manage process execution correctly.

#### Handling Background Process Switching

When an **active process is switched to the background**, additional operations are required to maintain proper execution and display behavior.

One key requirement is **VRAM separation** to ensure that processes running do not modify the visible screen output. 

Since a **processes cannot directly print to the display**, the kernel manages **five individual VRAM pages** (see [Physical Memory Layout](#physical-memory-layout)). When switching processes, the **kernel remaps the video memory pages** to ensure that respective processes only write to their own VRAM page.

#### Handling Active Process Switching

When a **background process is switched to the active one**, the kernel **copies the corresponding VRAM buffer to the display** and **remaps the vidmap** to reflect the new active process.

---
I was able to write this Technical Overview thanks to Peizhe's help ([website](https://os.paizhang.info/))
