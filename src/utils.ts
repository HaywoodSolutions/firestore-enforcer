import * as admin from 'firebase-admin';
import firebase from 'firebase';

export type Firestore = admin.firestore.Firestore|firebase.firestore.Firestore;
export type CollectionReference<T> = admin.firestore.CollectionReference<T>|firebase.firestore.CollectionReference<T>;
export type DocumentReference<T> = admin.firestore.DocumentReference<T> & firebase.firestore.DocumentReference<T>;
export type WriteResult = admin.firestore.WriteResult|void;
export type DocumentSnapshot<T> = admin.firestore.DocumentSnapshot<T>|firebase.firestore.DocumentSnapshot<T>;
export type QuerySnapshot<T> = admin.firestore.QuerySnapshot<T>|firebase.firestore.QuerySnapshot<T>;
export type Query<T> = admin.firestore.Query<T>|firebase.firestore.Query<T>;
export type QueryDocumentSnapshot<T> = admin.firestore.QueryDocumentSnapshot<T>|firebase.firestore.QueryDocumentSnapshot<T>;
export type WriteBatch = admin.firestore.WriteBatch|firebase.firestore.WriteBatch;

export class Batch {
  readonly db: Firestore;
  readonly batch: WriteBatch;

  constructor(db: Firestore) {
    this.db = db;
    this.batch = db.batch();
  }

  set<T>(doc: FirestoreDocument<T>, data: T): WriteBatch {
    return (this.batch.set as (ref: DocumentReference<T>, data: T) => WriteBatch)(doc.ref, data);
  }

  update<T>(doc: FirestoreDocument<T>, data: Partial<T>): WriteBatch {
    return (this.batch.update as (ref: DocumentReference<T>, data: Partial<T>) => WriteBatch)(doc.ref, data);
  }

  delete(doc: FirestoreDocument<any>): WriteBatch {
    return this.batch.delete(doc.ref);
  }

  commit(): Promise<WriteResult[]|void> {
    return this.batch.commit();
  }
}

export class FirestoreDocument<T extends Record<string|number, any>> {
  readonly ref: DocumentReference<T>;
  readonly collectionName: string;
  readonly docName: string;

  constructor(db: Firestore, collectionName: string, docName?: string) {
    this.collectionName = collectionName;

    if (docName) {
      this.docName = docName;
      this.ref = db.collection(collectionName).doc(docName) as DocumentReference<T>;
    } else {
      this.ref = db.collection(collectionName).doc() as DocumentReference<T>;
      this.docName = this.ref.id;
    }
  }

  set(data: T): Promise<WriteResult> {
    return this.ref.set(data);
  }

  update(data: Partial<T>, preconditions?: FirebaseFirestore.Precondition): Promise<WriteResult> {
    return this.ref.update(data, preconditions);
  }

  onSnapshot(next: (snapshot: FirebaseFirestore.DocumentSnapshot<T>) => void): () => void {
    return this.ref.onSnapshot(next);
  }

  get(): Promise<DocumentSnapshot<T>> {
    return this.ref.get();
  }

  delete(): Promise<WriteResult> {
    return this.ref.delete();
  }
}

export type QueryConditionOperator = "<"|"<="|"=="|">"|">="|"!="|"array-contains"|"array-contains-any"|"in"|"not-in"
export type QueryCondition = [string, QueryConditionOperator, any];

export class FirestoreCollection<T extends Record<string|number, any>> {
  readonly ref: CollectionReference<T>;
  readonly collectionName: string;

  constructor(private db: Firestore, collectionName: string) {
    this.collectionName = collectionName;
    this.ref = db.collection(collectionName) as CollectionReference<T>;
  }

  where(field: string, condition: QueryConditionOperator, value: any): FirestoreCollectionQuery<T> {
    return new FirestoreCollectionQuery(this.db, this.collectionName, [[field, condition, value]])
  }

  document(docName?: string): FirestoreDocument<T> {
    return new FirestoreDocument<T>(this.db, this.collectionName, docName);
  }

  onSnapshot(next: (snapshot: FirebaseFirestore.QuerySnapshot<T>) => void): () => void {
    return this.ref.onSnapshot(next);
  }

  getIds(): Promise<string[]> {
    return this.get().then((colSnap: QuerySnapshot<T>) => {
      let ids: string[] = [];

      colSnap.forEach((snap: DocumentSnapshot<T>) => {
        ids.push(snap.id);
      })

      return ids;
    })
  }
  
  get(): Promise<QuerySnapshot<T>> {
    return this.ref.get();
  }
}

class FirestoreCollectionQuery<T extends Record<string|number, any>> {
  readonly ref: Query<T>;
  readonly collectionName: string;
  readonly limitCount?: number;

  constructor(private db: Firestore, collectionName: string, private conditions: QueryCondition[], limit?: number) {
    this.collectionName = collectionName;
    this.ref = db.collection(collectionName) as CollectionReference<T>;
    this.limitCount = limit;

    for (const cond of conditions)
      this.ref = this.ref.where(cond[0], cond[1], cond[2]);
    if (limit) {
      this.ref = this.ref.limit(limit);
    }
  }

  where(field: string, condition: QueryConditionOperator, value: any): FirestoreCollectionQuery<T> {
    return new FirestoreCollectionQuery(this.db, this.collectionName, [...this.conditions, [field, condition, value]], this.limitCount)
  }

  limit(limit: number) {
    return new FirestoreCollectionQuery(this.db, this.collectionName, this.conditions, limit)
  }

  get(): Promise<QuerySnapshot<T>> {
    return this.ref.get();
  }
}

export type DBRefs<T extends Record<string, any>> = {
  [key in keyof T]: FirestoreCollection<T[key]>
};

export type DBGenerator = (db: Firestore) => Readonly<DBRefs<Record<string, any>>>;
export type DBBatchGenerator = (db: Firestore) => Readonly<Batch>;