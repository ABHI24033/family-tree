import express from "express";
import {
  createPerson,
  deletePerson,
  listPersons,
  addChild,
  addSpouse
} from "../controllers/Person.js";
import { getFamilyTree } from "../controllers/FamilyTree.js";

const router = express.Router();

// CRUD
router.post("/", createPerson);             
router.get("/", listPersons);       
router.delete("/:id", deletePerson);        

// family tree endpoint: nested structure
router.get("/tree/:id", getFamilyTree);
router.post("/child/:parentId", addChild);
router.post("/spouse/:id", addSpouse);

export default router;
