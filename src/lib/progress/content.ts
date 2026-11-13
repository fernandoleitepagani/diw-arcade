import {
  NODES,
  getChallenges,
  getFlashcards,
  getQuestions,
} from "../../content";
import type { ProgressContent } from "./events";

/** Static content for the star and next-step selectors. */
export const STATIC_CONTENT: ProgressContent = {
  questions: Object.fromEntries(
    NODES.map((node) => [node.id, getQuestions(node.id)]),
  ),
  flashcards: Object.fromEntries(
    NODES.map((node) => [node.id, getFlashcards(node.id)]),
  ),
  challenges: Object.fromEntries(
    NODES.map((node) => [node.id, getChallenges(node.id)]),
  ),
};
