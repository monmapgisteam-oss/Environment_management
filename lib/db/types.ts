import type { Models, Relations } from './models';

export type ModelName = keyof Models;
type Relation<M extends ModelName, K extends keyof Relations[M]> = Relations[M][K] extends {
  model: infer N extends ModelName; many: infer Many; nullable: infer Nullable;
} ? { model: N; many: Many; nullable: Nullable } : never;
type Filter<T> = T | { equals?: T; not?: T | Filter<T>; in?: T[]; notIn?: T[]; gt?: T; gte?: T; lt?: T; lte?: T };
export type Where<M extends ModelName> = {
  [K in keyof Models[M]]?: Filter<Models[M][K]>;
} & {
  [K in keyof Relations[M]]?: Where<Relation<M, K>['model']> | { isNot: null } | { is: null };
} & { AND?: Where<M> | Where<M>[]; OR?: Where<M>[]; NOT?: Where<M> | Where<M>[] };
type Selection<M extends ModelName> = {
  [K in keyof Models[M]]?: boolean;
} & Includes<M>;
type Includes<M extends ModelName> = {
  [K in keyof Relations[M]]?: boolean | Query<Relation<M, K>['model']>;
} & { _count?: { select: Partial<Record<keyof Relations[M], boolean>> } };
export type Query<M extends ModelName> = {
  where?: Where<M>;
  select?: Selection<M>;
  include?: Includes<M>;
  orderBy?: Partial<Record<keyof Models[M], 'asc' | 'desc'>> | Partial<Record<keyof Models[M], 'asc' | 'desc'>>[];
  take?: number;
  skip?: number;
};
type RelationValue<M extends ModelName, K extends keyof Relations[M], A> =
  Relation<M, K>['many'] extends true ? Payload<Relation<M, K>['model'], A>[] :
    Payload<Relation<M, K>['model'], A> | (Relation<M, K>['nullable'] extends true ? null : never);
type Selected<M extends ModelName, S> = {
  [K in keyof S as S[K] extends false | undefined ? never : K]:
    K extends keyof Models[M] ? Models[M][K] :
    K extends keyof Relations[M] ? RelationValue<M, K, S[K]> :
    K extends '_count' ? S[K] extends { select: infer C } ? { [P in keyof C]: number } : never : never;
};
export type Payload<M extends ModelName, A> = A extends { select: infer S } ? Selected<M, S> :
  Models[M] & (A extends { include: infer I } ? Selected<M, I> : {});
export type WriteData<M extends ModelName> = Partial<Models[M]> & {
  [K in keyof Relations[M]]?: {
    create?: WriteData<Relation<M, K>['model']> | WriteData<Relation<M, K>['model']>[];
    upsert?: { create: WriteData<Relation<M, K>['model']>; update: WriteData<Relation<M, K>['model']> };
  };
};

export interface Repository<M extends ModelName> {
  findMany<A extends Query<M> = Query<M>>(args?: A): Promise<Payload<M, A>[]>;
  findFirst<A extends Query<M>>(args?: A): Promise<Payload<M, A> | null>;
  findUnique<A extends Query<M>>(args: A): Promise<Payload<M, A> | null>;
  count(args?: { where?: Where<M> }): Promise<number>;
  create<A extends Query<M> & { data: WriteData<M> }>(args: A): Promise<Payload<M, A>>;
  update<A extends Query<M> & { data: WriteData<M> }>(args: A): Promise<Payload<M, A>>;
  createMany(args: { data: WriteData<M>[] }): Promise<{ count: number }>;
  updateMany(args: { where?: Where<M>; data: WriteData<M> }): Promise<{ count: number }>;
  deleteMany(args: { where?: Where<M> }): Promise<{ count: number }>;
}
