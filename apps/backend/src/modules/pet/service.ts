import { MedusaService } from "@medusajs/framework/utils"
import Pet from "./models/pet"

/**
 * MedusaService generates the CRUD surface (listPets, createPets, updatePets,
 * deletePets, retrievePet, ...) from the model, which is all the store routes
 * need — the ownership checks live in the routes, not here.
 */
class PetModuleService extends MedusaService({
  Pet,
}) {}

export default PetModuleService
