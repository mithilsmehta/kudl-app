import { MedusaService } from "@medusajs/framework/utils"
import RecommendationEvent from "./models/recommendation-event"

class RecommendationModuleService extends MedusaService({
  RecommendationEvent,
}) {}

export default RecommendationModuleService
