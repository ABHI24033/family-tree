
import Person from "../models/Person.js";

export const createPerson = async (req, res, next) => {
  try {
    const payload = req.body;
    const person = new Person(payload);
    await person.save();
    res.status(201).json(person);
  } catch (err) {
    next(err);
  }
};

export const getPerson = async (req, res, next) => {
  try {
    const personId = req.params.id;

    // Recursive helper
    const buildTree = async (id, depth = 1, maxDepth = 10) => {
      if (!id || depth > maxDepth) return null; // stop after 10 generations

      const person = await Person.findById(id)
        .lean() // faster read
        .populate("father mother spouse children", "name gender dateOfBirth children");

      if (!person) return null;

      // Recursively fetch all descendants
      if (person.children && person.children.length > 0) {
        person.children = await Promise.all(
          person.children.map((child) =>
            buildTree(child._id, depth + 1, maxDepth)
          )
        );
      }

      return person;
    };

    const tree = await buildTree(personId);

    if (!tree) return res.status(404).json({ message: "Person not found" });

    res.status(200).json(tree);
  } catch (err) {
    next(err);
  }
};

export const deletePerson = async (req, res, next) => {
  try {
    const person = await Person.findById(req.params.id);
    if (!person) return res.status(404).json({ message: "Person not found" });

    // Optionally: remove this person from parents' children arrays and spouse links
    await Person.updateMany(
      { children: person._id },
      { $pull: { children: person._id } }
    );
    await Person.updateMany(
      { $or: [{ father: person._id }, { mother: person._id }, { spouse: person._id }] },
      [{
        $set: {
          father: { $cond: [{ $eq: ["$father", person._id] }, null, "$father"] },
          mother: { $cond: [{ $eq: ["$mother", person._id] }, null, "$mother"] },
          spouse: { $cond: [{ $eq: ["$spouse", person._id] }, null, "$spouse"] }
        }
      }]
    ).catch(() => { }); // safe fallback for older Mongo versions

    await person.deleteOne();
    res.json({ message: "Person deleted" });
  } catch (err) {
    next(err);
  }
};

export const listPersons = async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const skip = (page - 1) * limit;

    const [count, persons] = await Promise.all([
      Person.countDocuments({}),
      Person.find({})
        .skip(skip)
        .limit(limit)
        .sort({ name: 1 })
    ]);
    res.json({ total: count, page, limit, data: persons });
  } catch (err) {
    next(err);
  }
};

export const addChild = async (req, res, next) => {
  try {
    const { parentId } = req.params;  // parentId from URL
    const { name, gender, birthYear, father, mother, spouse } = req.body; // child details

    // Validate parent
    const parent = await Person.findById(parentId);
    if (!parent) return res.status(404).json({ message: "Parent not found" });

    // Create child payload
    const childData = {
      name,
      gender,
      birthYear,
      spouse: spouse || null,
      father: father || (parent.gender === "Male" ? parent._id : null),
      mother: mother || (parent.gender === "Female" ? parent._id : null),
    };

    // Create child record
    const child = await Person.create(childData);

    // Add child reference to parent
    parent.children.push(child._id);
    await parent.save();

    // If parent has a spouse, also add child to spouse's children list
    if (parent.spouse) {
      await Person.findByIdAndUpdate(parent.spouse, {
        $addToSet: { children: child._id },
      });
    }

    // Return full populated parent (optional)
    const updatedParent = await Person.findById(parentId)
      .populate("children father mother spouse", "name gender dateOfBirth");

    res.status(201).json({
      message: "Child added successfully",
      parent: updatedParent,
      child,
    });
  } catch (err) {
    next(err);
  }
};


export const addSpouse = async (req, res, next) => {
  try {
    const { id } = req.params; 
    const { name, gender, birthYear } = req.body; 

    // --- 1. Validate Primary Person ---
    const person = await Person.findById(id);
    
    if (!person) {
      return res.status(404).json({ message: "Primary person not found" });
    }

    // --- 2. Check for existing spouse ---
    if (person.spouse) {
      return res.status(400).json({ message: "This person is already linked to a spouse." });
    }

    // --- 3. Create New Spouse Record ---
    const spouseData = {
      name,
      gender,
      birthYear,
      spouse: person._id, 
    };

    const newSpouse = await Person.create(spouseData);

    const updatedPerson = await Person.findByIdAndUpdate(
      id,
      {
        spouse: newSpouse._id,
        $addToSet: { children: { $each: person.children } } // Link existing children to the new spouse
      },
      { new: true }
    ).populate("children father mother spouse", "name gender dateOfBirth");

    // --- 5. Final Confirmation & Response ---
    res.status(201).json({
      message: "Spouse added and links established successfully",
      person: updatedPerson,
      spouse: newSpouse,
    });
  } catch (err) {
    next(err);
  }
};
