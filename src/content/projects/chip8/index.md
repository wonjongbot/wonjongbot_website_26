---
title: "CHIP-8 Emulator"
year: 2022
description: "8-bit CPU simulator written in C++."
link: "https://github.com/wonjongbot/CHIP-8"
image: "/images/projects/chip8.jpg"
---

8-bit cpu simulator in c++.

# CHIP-8 Emulator

CHIP-8 emulator inspired by [Austin Morlan's CHIP-8 emulator](https://austinmorlan.com/posts/chip8_emulator/).

A takeaway from this project:

- Always check datatypes and how much data they can store
  
  `uint8_t` only stores 8 bits, so when I did
  
  ```c++
  uint8_t x = opcode & 0x0F00u;
  x = x  >> 8u;
  ```

    `x` ends up only storing 0 since it can only save the first byte. Hence, the variable's datatype should be bigger than 8 bits or do all of operation in one line like below

    ```c++
    uint8_t x = (opcode & 0x0F00u) >> 8u;
    ```

![Chip8](/images/projects/chip8.jpg)

## Usage

Required library: SDL2

Use makefile within source directory to build the emulator

```bash
cd source
make
```

Run the emulator

```bash
./chip8 <Scale> <Delay> <ROM>
```

- Scale: Multiplier for the window. Scale of 1 is 64 x 32 pixles
- Delay: Delay between each instruction. Use this to control speed of a program execution
- ROM: ROM file name. I recommend downloading from [this](https://github.com/dmatlack/chip8/tree/master/roms/games) repo
