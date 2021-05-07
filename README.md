# Firestore Enforcer

A little library to easily use firestore client and admin side, using the same rules.

Have fun!

### An example

`setup.ts`

```
import { DBGenerator, DBBatchGenerator, DBRefs, FirestoreCollection, Batch } from "firestore-structure-enforcer";

export type Structure = {
  rooms: {
    roomId: string,
    count: number
  }
}

export type DB = Readonly<DBRefs<Structure>>;

export const genDB: DBGenerator = (db) => {
  return {
    rooms: new FirestoreCollection<Room>(db, 'rooms')
  };
};

export const genDBBatch: DBBatchGenerator = (db) => {
  return () => new Batch(db);
};
```

`dbInstance.ts`
```
import firebase from "firebase/app";
import { genDB, DB } from "./setup.ts";

firebase.initializeApp();

const firestore = firebase.firestore();

export const db: DB = genDB(firestore);
export const batch: DB = genDBBatch(firestore);
```

`documentUsage.ts`
```
import { db } from "./dbInstance.ts";

db.rooms.document("roomIdA").set({
  roomId: "roomIdA",
  count: 0
});

db.rooms.document("roomIdA").get().then((snap) => {
  const data = snap.data();
});

db.rooms.document("roomIdA").update({
  count: 5
});

db.rooms.document("roomIdA").delete();

db.rooms.document("roomIdA").onSnapshot((snap) => {
  //...
});
```