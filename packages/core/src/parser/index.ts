/**
 * Dialogue DSL Parser
 *
 * Parses .dlg files written in the custom DSL syntax into Dialogue entities.
 * Supports:
 * - Structure keywords: NODE, END, GOTO, TRIGGER, REQUIRE
 * - Dialogue keywords: SPEAKER:, NARRATOR:, VOICE
 * - Choice blocks with conditions and effects
 * - Conditional blocks (IF/END)
 * - All 14 condition types
 * - All 24 effect types
 * - @localization keys and "inline text"
 */

import type { Dialogue, DialogueNode, Choice } from '../types/entities'
import type { Condition } from '../types/conditions'
import type { Effect } from '../types/effects'

/**
 * Token represents a line of DSL code with metadata
 */
interface Token {
  line: string
  lineNumber: number
  indent: number
}

/**
 * Tokenize input string into processable tokens
 * - Removes comments (anything after #)
 * - Removes blank lines
 * - Tracks line numbers for error reporting
 * - Tracks indentation for nested structures
 */
function tokenize(input: string): Token[] {
  return input
    .split('\n')
    .map((line, index) => ({
      original: line,
      lineNumber: index + 1,
    }))
    .map(({ original, lineNumber }) => {
      // Remove comments (but preserve # inside quotes)
      let withoutComment = original
      const hashIndex = original.indexOf('#')
      if (hashIndex === -1) {
        // No # at all, keep as-is
        withoutComment = original
      } else {
        const quoteMatch = original.match(/"[^"]*"/)
        if (quoteMatch) {
          const quoteStart = original.indexOf(quoteMatch[0])
          const quoteEnd = quoteStart + quoteMatch[0].length
          if (hashIndex < quoteStart) {
            // # is before the quote — it's a comment
            withoutComment = original.substring(0, hashIndex)
          } else if (hashIndex >= quoteStart && hashIndex < quoteEnd) {
            // # is inside quotes — preserve it, strip any # after the quote
            withoutComment =
              original.substring(0, quoteEnd) + original.substring(quoteEnd).split('#')[0]
          } else {
            // # is after the quote — strip from there
            withoutComment = original.substring(0, hashIndex)
          }
        } else {
          withoutComment = original.substring(0, hashIndex)
        }
      }

      // Calculate indentation level
      const indent = withoutComment.length - withoutComment.trimStart().length
      const line = withoutComment.trim()
      return { line, lineNumber, indent }
    })
    .filter((token) => token.line.length > 0)
}

/**
 * Parse text that may be a localization key or inline text
 * - @key -> returns "@key" (localization reference, resolved at snapshot time)
 * - "text" -> returns "text" (inline literal, quotes stripped)
 * - text -> returns "text" (plain text)
 */
function parseText(text: string): string {
  const trimmed = text.trim()

  // Localization key - keep as-is with @ prefix
  // Will be resolved to actual text by snapshot builder
  if (trimmed.startsWith('@')) {
    return trimmed
  }

  // Quoted inline text - strip quotes
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.substring(1, trimmed.length - 1)
  }

  // Plain text (shouldn't normally happen in well-formed DSL, but handle it)
  return trimmed
}

/**
 * Parse a condition string into a Condition object
 * Examples:
 *   "hasFlag metBartender" -> { type: 'hasFlag', flag: 'metBartender' }
 *   "variableGreaterThan gold 10" -> { type: 'variableGreaterThan', variable: 'gold', value: 10 }
 */
export function parseCondition(conditionStr: string): Condition {
  const parts = conditionStr.trim().split(/\s+/)
  const type = parts[0]

  switch (type) {
    case 'hasFlag':
      return { type: 'hasFlag', flag: parts[1] }
    case 'notFlag':
      return { type: 'notFlag', flag: parts[1] }
    case 'hasItem':
      return { type: 'hasItem', itemId: parts[1] }
    case 'variableEquals':
      return {
        type: 'variableEquals',
        variable: parts[1],
        value: isNaN(Number(parts[2])) ? parts[2] : Number(parts[2]),
      }
    case 'variableGreaterThan':
      return {
        type: 'variableGreaterThan',
        variable: parts[1],
        value: Number(parts[2]),
      }
    case 'variableLessThan':
      return {
        type: 'variableLessThan',
        variable: parts[1],
        value: Number(parts[2]),
      }
    case 'atLocation':
      return { type: 'atLocation', locationId: parts[1] }
    case 'questAtStage':
      return { type: 'questAtStage', questId: parts[1], stageId: parts[2] }
    case 'characterAt':
      return {
        type: 'characterAt',
        characterId: parts[1],
        locationId: parts[2],
      }
    case 'characterInParty':
      return { type: 'characterInParty', characterId: parts[1] }
    case 'relationshipAbove':
      return {
        type: 'relationshipAbove',
        characterId: parts[1],
        value: Number(parts[2]),
      }
    case 'relationshipBelow':
      return {
        type: 'relationshipBelow',
        characterId: parts[1],
        value: Number(parts[2]),
      }
    case 'timeIs':
      return { type: 'timeIs', startHour: Number(parts[1]), endHour: Number(parts[2]) }
    case 'itemAt':
      return { type: 'itemAt', itemId: parts[1], locationId: parts[2] }
    default:
      throw new Error(`Unknown condition type: ${type}`)
  }
}

/**
 * Parse an effect string into an Effect object
 * Examples:
 *   "SET flag metBartender" -> { type: 'setFlag', flag: 'metBartender' }
 *   "ADD variable gold -50" -> { type: 'addVariable', variable: 'gold', value: -50 }
 *   "NOTIFY @quest.started" -> { type: 'notify', message: '@quest.started' }
 */
export function parseEffect(effectStr: string): Effect {
  const trimmed = effectStr.trim()

  // Handle special cases that may have localization keys or quoted text
  if (trimmed.startsWith('NOTIFY ')) {
    return { type: 'notify', message: parseText(trimmed.substring(7)) }
  }
  if (trimmed.startsWith('MUSIC ')) {
    return { type: 'playMusic', track: trimmed.substring(6).trim() }
  }
  if (trimmed.startsWith('SOUND ')) {
    return { type: 'playSound', sound: trimmed.substring(6).trim() }
  }
  if (trimmed.startsWith('VIDEO ')) {
    return { type: 'playVideo', file: trimmed.substring(6).trim() }
  }

  const parts = trimmed.split(/\s+/)
  const keyword = parts[0]

  switch (keyword) {
    case 'SET':
      if (parts[1] === 'flag') {
        return { type: 'setFlag', flag: parts[2] }
      }
      if (parts[1] === 'variable') {
        return {
          type: 'setVariable',
          variable: parts[2],
          value: isNaN(Number(parts[3])) ? parts[3] : Number(parts[3]),
        }
      }
      if (parts[1] === 'questStage') {
        return { type: 'setQuestStage', questId: parts[2], stageId: parts[3] }
      }
      if (parts[1] === 'characterLocation') {
        return {
          type: 'setCharacterLocation',
          characterId: parts[2],
          locationId: parts[3],
        }
      }
      if (parts[1] === 'relationship') {
        return {
          type: 'setRelationship',
          characterId: parts[2],
          value: Number(parts[3]),
        }
      }
      if (parts[1] === 'characterStat') {
        return {
          type: 'setCharacterStat',
          characterId: parts[2],
          stat: parts[3],
          value: isNaN(Number(parts[4])) ? parts[4] : Number(parts[4]),
        }
      }
      if (parts[1] === 'mapEnabled') {
        return { type: 'setMapEnabled', enabled: parts[2] === 'true' }
      }
      throw new Error(`Unknown SET effect: ${parts[1]}`)

    case 'CLEAR':
      if (parts[1] === 'flag') {
        return { type: 'clearFlag', flag: parts[2] }
      }
      throw new Error(`Unknown CLEAR effect: ${parts[1]}`)

    case 'ADD':
      if (parts[1] === 'variable') {
        return {
          type: 'addVariable',
          variable: parts[2],
          value: Number(parts[3]),
        }
      }
      if (parts[1] === 'item') {
        return { type: 'addItem', itemId: parts[2] }
      }
      if (parts[1] === 'journalEntry') {
        return { type: 'addJournalEntry', entryId: parts[2] }
      }
      if (parts[1] === 'toParty') {
        return { type: 'addToParty', characterId: parts[2] }
      }
      if (parts[1] === 'relationship') {
        return {
          type: 'addRelationship',
          characterId: parts[2],
          value: Number(parts[3]),
        }
      }
      if (parts[1] === 'characterStat') {
        return {
          type: 'addCharacterStat',
          characterId: parts[2],
          stat: parts[3],
          value: Number(parts[4]),
        }
      }
      throw new Error(`Unknown ADD effect: ${parts[1]}`)

    case 'REMOVE':
      if (parts[1] === 'item') {
        return { type: 'removeItem', itemId: parts[2] }
      }
      if (parts[1] === 'fromParty') {
        return { type: 'removeFromParty', characterId: parts[2] }
      }
      throw new Error(`Unknown REMOVE effect: ${parts[1]}`)

    case 'MOVE':
      if (parts[1] === 'item') {
        return { type: 'moveItem', itemId: parts[2], locationId: parts[3] }
      }
      throw new Error(`Unknown MOVE effect: ${parts[1]}`)

    case 'GOTO':
      if (parts[1] === 'location') {
        return { type: 'goToLocation', locationId: parts[2] }
      }
      throw new Error('GOTO should not be parsed as an effect')

    case 'ADVANCE':
      if (parts[1] === 'time') {
        return { type: 'advanceTime', hours: Number(parts[2]) }
      }
      throw new Error(`Unknown ADVANCE effect: ${parts[1]}`)

    case 'START':
      if (parts[1] === 'dialogue') {
        return { type: 'startDialogue', dialogueId: parts[2] }
      }
      throw new Error(`Unknown START effect: ${parts[1]}`)

    case 'END':
      if (parts[1] === 'dialogue') {
        return { type: 'endDialogue' }
      }
      throw new Error('END should not be parsed as an effect')

    default:
      throw new Error(`Unknown effect keyword: ${keyword}`)
  }
}

interface ChoiceParseResult {
  choice: Choice
  nextIndex: number
}

/**
 * Parse a CHOICE block
 * Syntax:
 *   CHOICE text
 *     REQUIRE condition (optional, multiple)
 *     effects
 *     speaker lines
 *     GOTO target or END dialogue
 *   END
 */
function parseChoice(
  tokens: Token[],
  startIndex: number,
  nodeId: string
): ChoiceParseResult {
  const token = tokens[startIndex]
  const choiceText = parseText(token.line.substring(7)) // Remove "CHOICE " and parse text

  const conditions: Condition[] = []
  const effects: Effect[] = []
  let next = ''

  let i = startIndex + 1
  const baseIndent = token.indent

  while (i < tokens.length) {
    const current = tokens[i]

    // Check for END at same indent level
    if (current.line === 'END' && current.indent === baseIndent) {
      i++
      break
    }

    if (current.line.startsWith('REQUIRE ')) {
      const conditionStr = current.line.substring(8).trim()
      conditions.push(parseCondition(conditionStr))
      i++
    } else if (current.line.startsWith('GOTO ')) {
      const gotoTarget = current.line.substring(5).trim()
      if (gotoTarget.startsWith('location ')) {
        // GOTO location ends dialogue and travels
        const locationId = gotoTarget.substring(9).trim()
        effects.push({ type: 'goToLocation', locationId })
        effects.push({ type: 'endDialogue' })
        next = '' // No next node, dialogue ends
      } else {
        next = gotoTarget
      }
      i++
    } else if (current.line.includes(':')) {
      // Speaker line within choice - not currently used in data model
      // Choices don't have their own speaker/text, they just route to next node
      i++
    } else {
      // Must be an effect
      effects.push(parseEffect(current.line))
      i++
    }
  }

  // Generate choice ID from node ID and text
  const sanitized = choiceText.replace(/[@"]/g, '').replace(/[^a-z0-9]/gi, '_')
  const choiceId = `${nodeId}_choice_${sanitized.toLowerCase().substring(0, 30)}`

  const choice: Choice = {
    id: choiceId,
    text: choiceText,
    conditions: conditions.length > 0 ? conditions : undefined,
    effects: effects.length > 0 ? effects : undefined,
    next: next || '',
  }

  return { choice, nextIndex: i }
}

interface IfBlockParseResult {
  condition: Condition
  next?: string
  effects: Effect[]
  nextIndex: number
}

/**
 * Parse an IF block
 * Syntax:
 *   IF condition
 *     GOTO target
 *     or effects
 *   END
 */
function parseIfBlock(tokens: Token[], startIndex: number): IfBlockParseResult {
  const token = tokens[startIndex]
  const conditionStr = token.line.substring(3).trim() // Remove "IF "
  const condition = parseCondition(conditionStr)

  let next: string | undefined
  const effects: Effect[] = []
  let i = startIndex + 1
  const baseIndent = token.indent

  while (i < tokens.length) {
    const current = tokens[i]

    // Check for END at same indent level
    if (current.line === 'END' && current.indent === baseIndent) {
      i++
      break
    }

    if (current.line.startsWith('GOTO ')) {
      next = current.line.substring(5).trim()
      i++
    } else {
      effects.push(parseEffect(current.line))
      i++
    }
  }

  return { condition, next, effects, nextIndex: i }
}

interface NodeParseResult {
  node: DialogueNode
  nextIndex: number
}

/**
 * Parse a NODE block
 * Syntax:
 *   NODE nodeId
 *     SPEAKER: text
 *       VOICE file.ogg
 *     effects
 *     IF blocks
 *     CHOICE blocks
 */
function parseNode(tokens: Token[], startIndex: number): NodeParseResult {
  const token = tokens[startIndex]
  const nodeId = token.line.substring(5).trim() // Remove "NODE "

  let speaker: string | null = null
  let text = ''
  let voice: string | undefined
  let portrait: string | undefined
  const conditions: Condition[] = []
  const choices: Choice[] = []
  const effects: Effect[] = []
  let next: string | undefined
  const conditionalNext: Array<{ condition: Condition; next: string }> = []

  let i = startIndex + 1

  while (i < tokens.length) {
    const current = tokens[i]

    // Check if we've reached the next node
    if (current.line.startsWith('NODE ')) {
      break
    }

    if (current.line.includes(':') && !current.line.startsWith('VOICE')) {
      // Speaker line
      const colonIndex = current.line.indexOf(':')
      const speakerName = current.line.substring(0, colonIndex).trim()
      const speakerText = current.line.substring(colonIndex + 1).trim()

      if (speakerName === 'NARRATOR') {
        speaker = null
      } else {
        speaker = speakerName.toLowerCase()
      }
      text = parseText(speakerText)
      i++
    } else if (current.line.startsWith('VOICE ')) {
      voice = current.line.substring(6).trim()
      i++
    } else if (current.line.startsWith('PORTRAIT ')) {
      portrait = current.line.substring(9).trim()
      i++
    } else if (current.line.startsWith('CHOICE ')) {
      const choiceResult = parseChoice(tokens, i, nodeId)
      choices.push(choiceResult.choice)
      i = choiceResult.nextIndex
    } else if (current.line.startsWith('IF ')) {
      const ifResult = parseIfBlock(tokens, i)
      if (ifResult.next) {
        // Conditional GOTO - store for engine to evaluate at runtime
        conditionalNext.push({
          condition: ifResult.condition,
          next: ifResult.next,
        })
      }
      // Add any effects from IF block
      effects.push(...ifResult.effects)
      i = ifResult.nextIndex
    } else if (current.line.startsWith('GOTO ')) {
      const gotoTarget = current.line.substring(5).trim()
      if (gotoTarget.startsWith('location ')) {
        // GOTO location ends dialogue and travels
        const locationId = gotoTarget.substring(9).trim()
        effects.push({ type: 'goToLocation', locationId })
        effects.push({ type: 'endDialogue' })
      } else {
        next = gotoTarget
      }
      i++
    } else {
      // Must be an effect
      effects.push(parseEffect(current.line))
      i++
    }
  }

  const node: DialogueNode = {
    id: nodeId,
    speaker,
    text,
    voice,
    portrait,
    conditions: conditions.length > 0 ? conditions : undefined,
    choices,
    effects: effects.length > 0 ? effects : undefined,
    next,
  }

  // Store conditional next if any (extension to base type for IF blocks)
  if (conditionalNext.length > 0) {
    ;(node as any).conditionalNext = conditionalNext
  }

  return { node, nextIndex: i }
}

/**
 * Parse a complete dialogue from DSL source
 * @param input - The DSL source code
 * @param id - The dialogue ID
 * @returns A complete Dialogue entity
 */
export function parseDialogue(input: string, id: string): Dialogue {
  const tokens = tokenize(input)

  let triggerLocation: string | undefined
  const conditions: Condition[] = []
  const nodes: DialogueNode[] = []
  let startNode = ''

  let i = 0

  // Parse top-level directives
  while (i < tokens.length) {
    const token = tokens[i]

    if (token.line.startsWith('TRIGGER ')) {
      triggerLocation = token.line.substring(8).trim()
      i++
    } else if (token.line.startsWith('REQUIRE ')) {
      const conditionStr = token.line.substring(8).trim()
      conditions.push(parseCondition(conditionStr))
      i++
    } else if (token.line.startsWith('NODE ')) {
      // Parse node
      const nodeResult = parseNode(tokens, i)
      nodes.push(nodeResult.node)
      if (!startNode) {
        startNode = nodeResult.node.id
      }
      i = nodeResult.nextIndex
    } else {
      throw new Error(`Unexpected token at line ${token.lineNumber}: ${token.line}`)
    }
  }

  return {
    id,
    triggerLocation,
    conditions: conditions.length > 0 ? conditions : undefined,
    startNode,
    nodes,
  }
}
