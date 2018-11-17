import { init, state, run } from "./cpu"

const initWithV = (vDelta: NMap<number>, delta: Partial<typeof state> = {}) =>
    init({ ...delta, V: new Array(16).fill(0).map((_, i) => (vDelta[i] !== undefined ? vDelta[i] : 0)) })

declare var global: any
const mockMath = Object.create(global.Math)
mockMath.random = () => 0.5
global.Math = mockMath

describe("opcodes", () => {
    beforeEach(() => init())

    describe("flow opcodes", () => {
        it("Calls a subroutine.", () => {
            run(0x2123)
            expect(state.sp).toEqual(1)
            expect(state.pc).toEqual(0x123)
        })

        it("Calls a subrutine and returns", () => {
            run(0x2123)
            run(0x00ee)
            expect(state.pc).toEqual(0x200 + 2)
            expect(state.sp).toEqual(0)
        })

        it("Calls two subrutines and returns", () => {
            run(0x2123)
            run(0x2234)
            run(0x00ee)
            expect(state.sp).toEqual(1)
            expect(state.pc).toEqual(0x123 + 2)
        })

        it("Goto to NNN", () => {
            run(0x1123)
            expect(state.pc).toEqual(0x123)
        })

        it("Goto to V0 + NNN", () => {
            initWithV({ 0: 1 })
            run(0xb123)
            expect(state.pc).toEqual(0x123 + 1)
        })
    })

    describe("3XNN - skip if Vx === NN", () => {
        it("skips next if Vx === NN", () => {
            run(0x3000)
            expect(state.pc).toEqual(0x204)
        })

        it("runs next instruction if Vx === NN", () => {
            run(0x30ff)
            expect(state.pc).toEqual(0x202)
        })
    })
    describe("4XNN - skip if Vx !== NN", () => {
        it("skips next instruction when Vx !== NN", () => {
            run(0x40ff)
            expect(state.pc).toEqual(0x204)
        })

        it("runs next instruction when Vx === NN", () => {
            run(0x4000)
            expect(state.pc).toEqual(0x202)
        })
    })

    describe("5XY0 - skip if Vx === Vy", () => {
        it("skips next instruction if Vx === Vy", () => {
            run(0x5010)
            expect(state.pc).toEqual(0x204)
        })

        it("runs next instruction if Vx !== Vy", () => {
            initWithV({ 1: 108 })
            run(0x5010)
            expect(state.pc).toEqual(0x202)
        })
    })

    describe("9XY0 - skip if Vx !== Vy", () => {
        it("skips next instruction if Vx !== Vy", () => {
            initWithV({ 1: 108 })
            run(0x9010)
            expect(state.pc).toEqual(0x204)
        })

        it("runs next instruction if Vx === Vy", () => {
            run(0x9010)
            expect(state.pc).toEqual(0x202)
        })
    })

    describe("Cond opcodes", () => {
        it("Sets Vx to NN.", () => {
            run(0x61fa)
            expect(state.V[1]).toEqual(0xfa)
            expect(state.pc).toEqual(0x202)
            run(0x610f)
            expect(state.V[1]).toEqual(0x0f)
        })

        it("Adds NN to Vx.", () => {
            expect(state.V[1]).toEqual(0)
            run(0x71f0)
            expect(state.V[1]).toEqual(0xf0)

            expect(state.pc).toEqual(0x202)
            run(0x710f)
            expect(state.V[1]).toEqual(0xff)
            expect(state.pc).toEqual(0x204)
        })

        it("Sets Vx to Vy.", () => {
            initWithV({ 1: 108 })
            run(0x8010)
            expect(state.V[0]).toEqual(108)
            expect(state.pc).toEqual(0x202)
        })
    })

    describe("Bitwise opcodes", () => {
        describe("OR", () => {
            it("0 | 0", () => {
                run(0x8011)
                expect(state.V[0]).toEqual(0)
                expect(state.pc).toEqual(0x202)
            })

            it("0 | f", () => {
                initWithV({ 1: 0xf })
                run(0x8011)
                expect(state.V[0]).toEqual(0xf)
                expect(state.pc).toEqual(0x202)
            })
            it("e | 1", () => {
                initWithV({ 0: 0xe, 1: 1 })
                run(0x8011)
                expect(state.V[0]).toEqual(0xf)
                expect(state.pc).toEqual(0x202)
            })

            it("f | f", () => {
                initWithV({ 0: 0xf, 1: 0xf })
                run(0x8011)
                expect(state.V[0]).toEqual(0xf)
                expect(state.pc).toEqual(0x202)
            })
        })

        describe("AND", () => {
            it("0 & 0", () => {
                run(0x8011)
                expect(state.V[0]).toEqual(0)
                expect(state.pc).toEqual(0x202)
            })

            it("0 & f", () => {
                initWithV({ 1: 0xf })
                run(0x8012)
                expect(state.V[0]).toEqual(0)
                expect(state.pc).toEqual(0x202)
            })
            it("f & 0", () => {
                initWithV({ 0: 0xf })
                run(0x8012)
                expect(state.V[0]).toEqual(0)
                expect(state.pc).toEqual(0x202)
            })
            it("f & f", () => {
                initWithV({ 0: 0xf, 1: 0xf })
                run(0x8011)
                expect(state.V[0]).toEqual(0xf)
                expect(state.pc).toEqual(0x202)
            })
        })

        describe("XOR", () => {
            it("0 ^ 0", () => {
                run(0x8013)
                expect(state.V[0]).toEqual(0)
                expect(state.pc).toEqual(0x202)
            })

            it("0 ^ f", () => {
                initWithV({ 1: 0xf })
                run(0x8013)
                expect(state.V[0]).toEqual(0xf)
                expect(state.pc).toEqual(0x202)
            })
            it("f ^ 0", () => {
                initWithV({ 0: 0xf })
                run(0x8013)
                expect(state.V[0]).toEqual(0xf)
                expect(state.pc).toEqual(0x202)
            })
            it("f ^ f", () => {
                initWithV({ 0: 0xf, 1: 0xf })
                run(0x8013)
                expect(state.V[0]).toEqual(0)
                expect(state.pc).toEqual(0x202)
            })
        })
    })

    describe("AddVy", () => {
        it("Adds VY to VX and VF and sets Vf to 0 (no carry)", () => {
            initWithV({ 1: 0xf })
            run(0x8014)
            expect(state.V[0]).toEqual(0xf)
            expect(state.V[0xf]).toEqual(0)
            expect(state.pc).toEqual(0x202)
        })

        it("Adds VY to VX and sets Vf to 1 (a carry).", () => {
            initWithV({ 0: 0xff, 1: 0x1 })
            run(0x8014)
            expect(state.V[0]).toEqual(0xff + 0x1 - 256)
            expect(state.V[0xf]).toEqual(1)
            expect(state.pc).toEqual(0x202)
        })
    })

    describe("SubVy", () => {
        it("Subs Vx from VX and sets VF to 1 (no borrow).", () => {
            initWithV({ 0: 0xf, 1: 0xe })
            run(0x8015)
            expect(state.V[0]).toEqual(0x1)
            expect(state.V[0xf]).toEqual(1)
            expect(state.pc).toEqual(0x202)
        })

        it("Adds VY to VX and VF is set to 1 if there's a carry.", () => {
            initWithV({ 0: 0x0, 1: 0x1 })
            run(0x8015)
            expect(state.V[0]).toEqual(-1 + 256)
            expect(state.V[0xf]).toEqual(0)
            expect(state.pc).toEqual(0x202)
        })
    })

    describe(">>=", () => {
        it("1101 (0xd) >> 1 -> 110 (0x6) and VX = 1", () => {
            initWithV({ 0: 0xd })
            run(0x8006)
            expect(state.V[0]).toEqual(6)
            expect(state.V[0xf]).toEqual(1)
            expect(state.pc).toEqual(0x202)
        })
        it("(0xff) >> 1 -> 0111 111 (0x7f) and VX = 0", () => {
            initWithV({ 0: 0xfe })
            run(0x8006)
            expect(state.V[0]).toEqual(0x7f)
            expect(state.V[0xf]).toEqual(0)
            expect(state.pc).toEqual(0x202)
        })
    })

    describe("Vx = Vy - Vx", () => {
        it("no borrow case", () => {
            initWithV({ 0: 0x1, 1: 0x2 })
            run(0x8017)
            expect(state.V[0]).toEqual(0x1)
            expect(state.V[0xf]).toEqual(1)
            expect(state.pc).toEqual(0x202)
        })
        it("borrow case", () => {
            initWithV({ 0: 0x2, 1: 0x1 })
            run(0x8017)
            expect(state.V[0]).toEqual(-1 + 256)
            expect(state.V[0xf]).toEqual(0)
            expect(state.pc).toEqual(0x202)
        })
    })

    describe("Rand", () => {
        it("gives random value & 0x00", () => {
            run(0xc100)
            expect(state.V[1]).toEqual(0)
            expect(state.pc).toEqual(0x202)
        })

        it("gives random value & 0xff", () => {
            run(0xc1ff)
            expect(state.V[1]).toEqual(127)
            expect(state.pc).toEqual(0x202)
        })
    })

    describe("Draw", () => {
        it("sets draw flag and inc pc", () => {
            run(0xd000)
            expect(state.isDrawing).toEqual(true)
            expect(state.pc).toEqual(0x202)
            expect(state.I).toEqual(0)
            expect(state.V[0xf]).toEqual(0)
        })

        it("draws a sprit at (2,0) sprite (8,1)", () => {
            initWithV({ 0: 2, 1: 0 }, { I: 0x0 })
            state.memory.fill(0xff)
            run(0xd011)
            expect(state.V[0xf]).toEqual(0)
            expect(state.screen.slice(0, 2 + 8 + 1)).toEqual([0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0])
        })
    })
    describe("SkipIfKey", () => {
        it("skips when key is pressed", () => {
            initWithV({ 0: 1 }, { keys: { 1: true } })
            run(0xe09e)
            expect(state.pc).toEqual(0x204)
        })
        it("doesn't skip when key is not pressed", () => {
            initWithV({ 0: 1 }, { keys: { 1: false } })
            run(0xe09e)
            expect(state.pc).toEqual(0x202)
        })
    })

    describe("SkipIfNotKey", () => {
        it("doens't skips when key is pressed", () => {
            initWithV({ 0: 1 }, { keys: { 1: true } })
            run(0xe0a1)
            expect(state.pc).toEqual(0x202)
        })
        it("skips when key is not pressed", () => {
            initWithV({ 0: 1 }, { keys: { 1: false } })
            run(0xe0a1)
            expect(state.pc).toEqual(0x204)
        })
    })

    describe("setDelayTimerToVx", () => {
        it("sets state.delayTimer to Vx value and inc pc", () => {
            initWithV({ 1: 108 })
            run(0xf115)
            expect(state.delayTimer).toEqual(108)
            expect(state.pc).toEqual(0x202)
        })
    })

    describe("delayTimer", () => {
        it("sets Vx to state.delayTimer and inc pc", () => {
            initWithV({ 1: 108 }, { delayTimer: 42 })
            run(0xf107)
            expect(state.V[1]).toEqual(42)
            expect(state.pc).toEqual(0x202)
        })
    })

    describe("setSoundTimerToVx", () => {
        it("sets state.soundTimer to Vx value and inc pc", () => {
            initWithV({ 1: 108 })
            run(0xf118)
            expect(state.soundTimer).toEqual(108)
            expect(state.pc).toEqual(0x202)
        })
    })

    describe("addVxToI", () => {
        it("adds VX and inc pc", () => {
            initWithV({ 1: 108 })
            run(0xf11e)
            expect(state.I).toEqual(108)
            expect(state.V[0xf]).toEqual(0)
            expect(state.pc).toEqual(0x202)
        })

        it("adds VX, inc pc and sets Vf to 1 on overflow (> 0xfff)", () => {
            initWithV({ 1: 0x1 }, { I: 0xfff })
            run(0xf11e)
            expect(state.I).toEqual(0xfff + 1)
            expect(state.V[0xf]).toEqual(1)
            expect(state.pc).toEqual(0x202)
        })
    })
    describe("setIBySprite", () => {
        it("sets i to Vx * 5 and inc pc", () => {
            initWithV({ 1: 2 }, { I: 0xfff })
            run(0xf129)
            expect(state.I).toEqual(10)
            expect(state.pc).toEqual(0x202)
        })
    })

    describe("loadVxBDC", () => {
        it("sets memory[i] = DBC(Vx)", () => {
            initWithV({ 1: 108 }, { I: 100 })
            run(0xf133)
            expect(state.memory[100]).toEqual(1)
            expect(state.memory[101]).toEqual(0)
            expect(state.memory[102]).toEqual(8)
        })
        it("sets memory[i] = DBC(Vx) for 2 digits no", () => {
            initWithV({ 0: 42 })
            run(0xf033)
            expect(state.memory[0]).toEqual(0)
            expect(state.memory[1]).toEqual(4)
            expect(state.memory[2]).toEqual(2)
        })
    })

    describe("storeVs", () => {
        it("stores V0, V1 in memory", () => {
            initWithV({ 0: 1, 1: 2 }, { I: 100 })
            run(0xf155)
            expect(state.memory[100]).toEqual(1)
            expect(state.memory[101]).toEqual(2)
            expect(state.I).toEqual(100 + 1 + 1)
        })

        it("stores V0 ... V15 in memory", () => {
            const vs: SMap<number> = {}
            for (let i = 0; i <= 15; i++) vs[i] = i + 1
            initWithV(vs, { I: 100 })
            run(0xff55)
            for (let i = 0; i <= 15; i++) expect(state.memory[100 + i]).toEqual(i + 1)
            expect(state.I).toEqual(100 + 15 + 1)
        })
    })

    describe("restoreVs", () => {
        it("restores V0, V1 from memory[state.I]", () => {
            initWithV({ 0: 1, 1: 2 }, { I: 100 })
            run(0xf155)
            state.V = new Array(16).fill(0)
            state.I = 100
            run(0xf165)
            expect(state.V[0]).toEqual(1)
            expect(state.V[1]).toEqual(2)
            expect(state.I).toEqual(100 + 1 + 1)
        })
    })
    // tslint:disable-next-line:max-file-line-count
})
