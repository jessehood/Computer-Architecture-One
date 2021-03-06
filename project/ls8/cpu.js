/**
 * LS-8 v2.0 emulator skeleton code
 */

const fs = require("fs");

// Instructions

const HLT =  0b00000001; // Halt CPU
const ADD =  0b10101000;
const LDI =  0b10011001;
const MUL =  0b10101010;
const PRN =  0b01000011;
const PUSH = 0b01001101; 
const POP  = 0b01001100;
const CMP =  0b10100000;
const JEQ  = 0b01010001;
const JMP  = 0b01010000;
const JNE  = 0b01010010;

const SP = 0x07; // Stack pointer

const FL_EQ = 0b00000001;
const FL_GT = 0b00000010;
const FL_LT = 0b00000100;

/**
 * Class for simulating a simple Computer (CPU & memory)
 */
class CPU {
  /**
   * Initialize the CPU
   */
  constructor(ram) {
    this.ram = ram;

    this.reg = new Array(8).fill(0); // General-purpose registers

    // Special-purpose registers
    this.reg.PC = 0; // Program Counter
    this.reg.IR = 0; // Instruction Register
    this.reg.FL = 0; // Flag register
    this.setupBranchTable();
  }

  /**
   * Sets up the branch table
   */
  setupBranchTable() {
    let bt = {};

    bt[ADD]  = this.ADD;
    bt[CMP]  = this.CMP;
    bt[HLT]  = this.HLT;
    bt[JEQ]  = this.JEQ;
    bt[JMP]  = this.JMP;
    bt[JNE]  = this.JNE;
    bt[LDI]  = this.LDI;
    bt[MUL]  = this.MUL;
    bt[POP]  = this.POP;
    bt[PRN]  = this.PRN;
    bt[PUSH] = this.PUSH;
    this.branchTable = bt;
  }

  /**
   * Store value in memory address, useful for program loading
   */
  poke(address, value) {
    this.ram.write(address, value);
  }

  /**
   * Starts the clock ticking on the CPU
   */
  startClock() {
    const _this = this;

    this.clock = setInterval(() => {
      _this.tick();
    }, 1);
  }

  /**
   * Stops the clock
   */
  stopClock() {
    clearInterval(this.clock);
  }

  setFlag(flag, value) {
    if (value) {
      this.reg.FL = this.reg.FL | flag;
    } else {
      this.reg.FL = this.reg.FL & (~flag);
    }
  }

  getFlag(f) {
    return (this.reg.FL & (1 << f)) >> f;
  }

  /**
   * ALU functionality
   *
   * op can be: ADD SUB MUL DIV INC DEC CMP
   */
  alu(op, regA, regB) {
    switch (op) {
      case 'MUL':
        this.reg[regA] = this.reg[regA] * this.reg[regB];
        break;
      case 'ADD':
        this.reg[regA] = this.reg[regA] + this.reg[regB];
        break;
      case 'AND':
        this.reg[regA] = this.reg[regA] & this.reg[regB];
        break;
      case 'CMP':
        this.setFlag(FL_EQ, this.reg[regA] === this.reg[regB]);
        this.setFlag(FL_GT, this.reg[regA] > this.reg[regB]);
        this.setFlag(FL_LT, this.reg[regA] < this.reg[regB]);
        break;
    }
  }

  /**
   * Advances the CPU one cycle
   */
  tick() {
    // Load the instruction register (IR) from the current PC
    this.reg.IR = this.ram.read(this.reg.PC);
    // Debugging output
    // console.log(`${this.reg.PC}: ${this.reg.IR.toString(2)}`);

    // Based on the value in the Instruction Register, locate the
    // appropriate hander in the branchTable
    let handler = this.branchTable[this.reg.IR];
    // Check that the handler is defined, halt if not (invalid
    // instruction)
    if (!handler) {
      console.error('Unknown opcode', this.reg.IR);
      this.stopClock();
      return;
    }
    
    // Read OperandA and OperandB
    let operandA = this.ram.read(this.reg.PC + 1);
    let operandB = this.ram.read(this.reg.PC + 2);
    
    // We need to use call() so we can set the "this" value inside
    // the handler (otherwise it will be undefined in the handler)
    let nextPc = handler.call(this, operandA, operandB);
    if (nextPc == undefined) {
      // Increment the PC register to go to the next instruction
      this.reg.PC += ((this.reg.IR >> 6) & 0b00000011) + 1;
    } else {
      this.reg.PC = nextPC;
    }
  }
  
  // INSTRUCTION HANDLER CODE:
  ADD(regA, regB) {
    this.alu('ADD', regA, regB);
  }
  
  CALL(regNum) {
    // Push next address on stack
    this.pushHelper(this.reg.PC + 2);

    // Set PC to value in regNum
    return this.reg[regNum];
  }


  CMP(regA, regB) {
    this.alu('CMP', regA, regB);
  }

  /**
   * HLT
   */
  HLT() {
    this.stopClock();
  }

  JEQ(regNum) {
    if (this.getFlag(FL_EQ)) return this.reg[regNum];
  }

  JMP(regNum) {
    return this.reg[regNum];
  }

  JNE(regNum) {
    if (!this.getFlag(FL_EQ)) return this.reg[regNum]; 
  }

  /**
   * LDI R,I
   */
  LDI(regNum, value) {
    this.reg[regNum] = value;
  }

  /**
   * MUL R,R
   */
  MUL(regA, regB) {
    this.alu("MUL", regA, regB);
  }
  
  popHelper() {
    let val = this.ram.read(this.reg[SP]);
    this.reg[SP]++;

    return val;
  }

  POP(regNum) {
    let val = this.popHelper();
    this.reg[regNum] = val;
  }


  /**
   * PRN R
   */
  PRN(regA) {
    console.log(this.reg[regA]);
  }
  
  pushHelper(value) {
    this.reg[SP]--;
    this.ram.write(this.reg[SP], value);
  }

  PUSH(regNum) {
    let value = this.reg[regNum];
    this.pushHelper(value);
  }
}

module.exports = CPU;
