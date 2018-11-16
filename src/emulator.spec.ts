import { opcodes, init, state } from "./emulator"

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
            opcodes.call(0x2123)
            expect(state.sp).toEqual(1)
            expect(state.pc).toEqual(0x123)
        })

        it("Calls a subrutine and returns", () => {
            opcodes.call(0x2123)
            opcodes.return()
            expect(state.pc).toEqual(0x200)
            expect(state.sp).toEqual(0)
        })

        it("Calls two subrutines and returns", () => {
            opcodes.call(0x2123)
            opcodes.call(0x2234)
            opcodes.return()
            expect(state.sp).toEqual(1)
            expect(state.pc).toEqual(0x123)
        })

        it("Goto to NNN", () => {
            opcodes.gotoNNN(0x1123)
            expect(state.pc).toEqual(0x123)
        })

        it("Goto to V0 + NNN", () => {
            initWithV({ 0: 1 })
            opcodes.gotoV0PlusNNN(0xb123)
            expect(state.pc).toEqual(0x123 + 1)
        })
    })

    describe("Conditional opcodes", () => {
        it("runs next instruction when VX are not equal", () => {
            opcodes.skipIfNNEq(0x30ff)
            expect(state.pc).toEqual(0x202)
        })
        it("skips next instruction when VX are equal", () => {
            opcodes.skipIfNNEq(0x3000)
            expect(state.pc).toEqual(0x204)
        })

        it("runs next instruction when VX are equal", () => {
            opcodes.skipIfNNNotEq(0x30ff)
            expect(state.pc).toEqual(0x204)
        })
        it("skips next instruction when VX are not equal", () => {
            opcodes.skipIfNNNotEq(0x3000)
            expect(state.pc).toEqual(0x202)
        })

        it("skips next instruction if V[X] === V[Y]", () => {
            opcodes.skipIfVyEq(0x5010)
            expect(state.pc).toEqual(0x204)
        })
        it("runs next instruction if V[X] === V[Y]", () => {
            initWithV({ 1: 108 })
            opcodes.skipIfVyEq(0x5010)
            expect(state.pc).toEqual(0x202)
        })
    })

    describe("Cond opcodes", () => {
        it("Sets Vx to NN.", () => {
            opcodes.setNN(0x61fa)
            expect(state.V[1]).toEqual(0xfa)
            expect(state.pc).toEqual(0x202)
            opcodes.setNN(0x610f)
            expect(state.V[1]).toEqual(0x0f)
        })

        it("Adds NN to Vx.", () => {
            expect(state.V[1]).toEqual(0)
            opcodes.addNN(0x71f0)
            expect(state.V[1]).toEqual(0xf0)

            expect(state.pc).toEqual(0x202)
            opcodes.addNN(0x710f)
            expect(state.V[1]).toEqual(0xff)
            expect(state.pc).toEqual(0x204)
        })

        it("Sets Vx to Vy.", () => {
            initWithV({ 1: 108 })
            opcodes.setVy(0x8010)
            expect(state.V[0]).toEqual(108)
            expect(state.pc).toEqual(0x202)
        })
    })

    describe("Bitwise opcodes", () => {
        describe("OR", () => {
            it("0 | 0", () => {
                opcodes.orVy(0x8011)
                expect(state.V[0]).toEqual(0)
                expect(state.pc).toEqual(0x202)
            })

            it("0 | f", () => {
                initWithV({ 1: 0xf })
                opcodes.orVy(0x8011)
                expect(state.V[0]).toEqual(0xf)
                expect(state.pc).toEqual(0x202)
            })
            it("e | 1", () => {
                initWithV({ 0: 0xe, 1: 1 })
                opcodes.orVy(0x8011)
                expect(state.V[0]).toEqual(0xf)
                expect(state.pc).toEqual(0x202)
            })

            it("f | f", () => {
                initWithV({ 0: 0xf, 1: 0xf })
                opcodes.orVy(0x8011)
                expect(state.V[0]).toEqual(0xf)
                expect(state.pc).toEqual(0x202)
            })
        })

        describe("AND", () => {
            it("0 | 0", () => {
                opcodes.andVy(0x8011)
                expect(state.V[0]).toEqual(0)
                expect(state.pc).toEqual(0x202)
            })

            it("0 | f", () => {
                initWithV({ 1: 0xf })
                opcodes.andVy(0x8011)
                expect(state.V[0]).toEqual(0)
                expect(state.pc).toEqual(0x202)
            })
            it("f | 0", () => {
                initWithV({ 0: 0xf })
                opcodes.andVy(0x8011)
                expect(state.V[0]).toEqual(0)
                expect(state.pc).toEqual(0x202)
            })
            it("f | f", () => {
                initWithV({ 0: 0xf, 1: 0xf })
                opcodes.andVy(0x8011)
                expect(state.V[0]).toEqual(0xf)
                expect(state.pc).toEqual(0x202)
            })
        })

        describe("XOR", () => {
            it("0 | 0", () => {
                opcodes.xorVy(0x8011)
                expect(state.V[0]).toEqual(0)
                expect(state.pc).toEqual(0x202)
            })

            it("0 | f", () => {
                initWithV({ 1: 0xf })
                opcodes.xorVy(0x8011)
                expect(state.V[0]).toEqual(0xf)
                expect(state.pc).toEqual(0x202)
            })
            it("f | 0", () => {
                initWithV({ 0: 0xf })
                opcodes.xorVy(0x8011)
                expect(state.V[0]).toEqual(0xf)
                expect(state.pc).toEqual(0x202)
            })
            it("f | f", () => {
                initWithV({ 0: 0xf, 1: 0xf })
                opcodes.xorVy(0x8011)
                expect(state.V[0]).toEqual(0)
                expect(state.pc).toEqual(0x202)
            })
        })
    })

    describe("AddVy", () => {
        it("Adds VY to VX and VF and sets Vf to 0 (no carry)", () => {
            initWithV({ 1: 0xf })
            opcodes.addVy(0x8014)
            expect(state.V[0]).toEqual(0xf)
            expect(state.V[0xf]).toEqual(0)
            expect(state.pc).toEqual(0x202)
        })

        it("Adds VY to VX and sets Vf to 1 (a carry).", () => {
            initWithV({ 0: 0xff, 1: 0x1 })
            opcodes.addVy(0x8014)
            expect(state.V[0]).toEqual(0xff + 0x1 - 256)
            expect(state.V[0xf]).toEqual(1)
            expect(state.pc).toEqual(0x202)
        })
    })

    describe("SubVy", () => {
        it("Subs Vx from VX and sets VF to 1 (no borrow).", () => {
            initWithV({ 0: 0xf, 1: 0xe })
            opcodes.subVy(0x8015)
            expect(state.V[0]).toEqual(0x1)
            expect(state.V[0xf]).toEqual(1)
            expect(state.pc).toEqual(0x202)
        })

        it("Adds VY to VX and VF is set to 1 if there's a carry.", () => {
            initWithV({ 0: 0x0, 1: 0x1 })
            opcodes.subVy(0x8015)
            expect(state.V[0]).toEqual(-1 + 256)
            expect(state.V[0xf]).toEqual(0)
            expect(state.pc).toEqual(0x202)
        })
    })

    describe(">>=", () => {
        it("1101 (0xd) >> 1 -> 110 (0x6) and VX = 1", () => {
            initWithV({ 0: 0xd })
            opcodes.shiftRight(0x8006)
            expect(state.V[0]).toEqual(6)
            expect(state.V[0xf]).toEqual(1)
            expect(state.pc).toEqual(0x202)
        })
        it("(0xff) >> 1 -> 0111 111 (0x7f) and VX = 0", () => {
            initWithV({ 0: 0xfe })
            opcodes.shiftRight(0x8006)
            expect(state.V[0]).toEqual(0x7f)
            expect(state.V[0xf]).toEqual(0)
            expect(state.pc).toEqual(0x202)
        })
    })

    describe("Vx = Vy - Vx", () => {
        it("no borrow case", () => {
            initWithV({ 0: 0x1, 1: 0x2 })
            opcodes.setVyMinusVx(0x8017)
            expect(state.V[0]).toEqual(0x1)
            expect(state.V[0xf]).toEqual(1)
            expect(state.pc).toEqual(0x202)
        })
        it("borrow case", () => {
            initWithV({ 0: 0x2, 1: 0x1 })
            opcodes.setVyMinusVx(0x8017)
            expect(state.V[0]).toEqual(-1 + 256)
            expect(state.V[0xf]).toEqual(0)
            expect(state.pc).toEqual(0x202)
        })
    })

    describe("Rand", () => {
        it("gives random value & 0x00", () => {
            opcodes.randAndNN(0xc100)
            expect(state.V[1]).toEqual(0)
            expect(state.pc).toEqual(0x202)
        })

        it("gives random value & 0xff", () => {
            opcodes.randAndNN(0xc1ff)
            expect(state.V[1]).toEqual(127)
            expect(state.pc).toEqual(0x202)
        })
    })

    describe("Draw", () => {
        it("sets draw flag and inc pc", () => {
            opcodes.draw(0xd000)
            expect(state.isDrawing).toEqual(true)
            expect(state.pc).toEqual(0x202)
            expect(state.I).toEqual(0)
            expect(state.V[0xf]).toEqual(0)
        })

        it("draws a sprit at (2,0) sprite (8,1)", () => {
            initWithV({ 0: 2, 1: 0 }, { I: 0x0 })
            state.memory.fill(0xff)
            opcodes.draw(0xd011)
            expect(state.V[0xf]).toEqual(0)
            expect(state.display.content.slice(0, 2 + 8 + 1)).toEqual([0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0])
        })
    })
    describe("SkipIfKey", () => {
        it("skips when key is pressed", () => {
            initWithV({ 0: 1 }, { pressedKeys: { 1: true } })
            opcodes.skipIfKey(0xe09e)
            expect(state.pc).toEqual(0x204)
        })
        it("doesn't skip when key is not pressed", () => {
            initWithV({ 0: 1 }, { pressedKeys: { 1: false } })
            opcodes.skipIfKey(0xe09e)
            expect(state.pc).toEqual(0x202)
        })
    })

    describe("SkipIfNotKey", () => {
        it("doens't skips when key is pressed", () => {
            initWithV({ 0: 1 }, { pressedKeys: { 1: true } })
            opcodes.skipIfNotKey(0xe09e)
            expect(state.pc).toEqual(0x202)
        })
        it("skips when key is not pressed", () => {
            initWithV({ 0: 1 }, { pressedKeys: { 1: false } })
            opcodes.skipIfNotKey(0xe09e)
            expect(state.pc).toEqual(0x204)
        })
    })
    // tslint:disable-next-line:max-file-line-count
})
