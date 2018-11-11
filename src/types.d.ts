type Casted<T, S> = { [P in keyof T]: S }
type TMap<TKey extends string | number, TValue> = { [K in TKey]: TValue }
type NMap<TValue> = TMap<number, TValue>
type SMap<TValue> = TMap<string, TValue>
