import Person from "../models/Person.js";

async function buildTree(personId, depth = 0, maxDepth = 20) {
  if (!personId) return null;
  if (depth > maxDepth) return { _id: personId, truncated: true };

  const person = await Person.findById(personId)
    .populate("father mother spouse children")
    .lean();

  if (!person) return null;

  // Build children subtrees
  const children = [];
  if (Array.isArray(person.children) && person.children.length) {
    for (const child of person.children) {
      // child may already be populated (object) or an id (ObjectId)
      const childId = child._id ? child._id : child;
      const subtree = await buildTree(childId, depth + 1, maxDepth);
      if (subtree) children.push(subtree);
    }
  }

  return {
    _id: person._id,
    name: person.name,
    gender: person.gender,
    birthYear: person.birthYear,
    photoUrl: person.photoUrl,
    father: person.father ? {
      _id: person.father._id,
      name: person.father.name,
      birthYear: person.father.birthYear,
    } : null,
    mother: person.mother ? {
      _id: person.mother._id,
      name: person.mother.name,
      birthYear: person?.mother?.birthYear,
    } : null,
    spouse: person.spouse ? { 
      _id: person.spouse._id, 
      name: person.spouse.name, 
      birthYear: person?.spouse?.birthYear, 
    } : null,
    children
  };
}

export const getFamilyTree = async (req, res, next) => {
  try {
    const rootId = req.params.id;
    const maxDepth = Math.min(Number(req.query.maxDepth) || 10, 50);
    const tree = await buildTree(rootId, 0, maxDepth);
    if (!tree) return res.status(404).json({ message: "Person not found" });
    res.json(tree);
  } catch (err) {
    next(err);
  }
};
