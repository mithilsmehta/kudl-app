import { Module } from "@medusajs/framework/utils"
import PetModuleService from "./service"

export const PET_MODULE = "pet"

export default Module(PET_MODULE, {
  service: PetModuleService,
})
