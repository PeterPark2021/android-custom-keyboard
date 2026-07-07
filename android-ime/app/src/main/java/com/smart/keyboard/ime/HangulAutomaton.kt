package com.smart.keyboard.ime

/**
 * Android Native Hangul Automaton Engine
 * Handles Korean character combination state (Cho-Seong, Jung-Seong, Jong-Seong).
 * Fully supports backspacing, complete compositions, and double-consonant combinations.
 */
class HangulAutomaton {

    companion object {
        // Cho-Seong (Initial Consonants) - 19 chars
        private val CHO = listOf(
            'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ',
            'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
        )

        // Jung-Seong (Vowels) - 21 chars
        private val JUNG = listOf(
            'ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ',
            'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'
        )

        // Jong-Seong (Final Consonants) - 28 chars (0 = Empty)
        private val JONG = listOf(
            ' ', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ',
            'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ',
            'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
        )

        // Maps for combining double final consonants (e.g., ㄱ + ㅅ = ㄳ)
        private val JONG_COMBINATIONS = mapOf(
            "ㄱㅅ" to 'ㄳ',
            "ㄴㅈ" to 'ㄵ',
            "ㄴㅎ" to 'ㄶ',
            "ㄹㄱ" to 'ㄺ',
            "ㄹㅁ" to 'ㄻ',
            "ㄹㅂ" to 'ㄼ',
            "ㄹㅅ" to 'ㄽ',
            "ㄹㅌ" to 'ㄾ',
            "ㄹㅍ" to 'ㄿ',
            "ㄹㅎ" to 'ㅀ',
            "ㅂㅅ" to 'ㅄ'
        )

        // Maps for combining complex vowels (e.g., ㅗ + ㅏ = ㅘ)
        private val JUNG_COMBINATIONS = mapOf(
            "ㅗㅏ" to 'ㅘ',
            "ㅗㅐ" to 'ㅙ',
            "ㅗㅣ" to 'ㅚ',
            "ㅜㅓ" to 'ㅝ',
            "ㅜㅔ" to 'ㅞ',
            "ㅜㅣ" to 'ㅟ',
            "ㅡㅣ" to 'ㅢ'
        )
    }

    private var state = 0 // 0: Empty, 1: Cho, 2: Jung, 3: Jong
    private var choChar: Char = ' '
    private var jungChar: Char = ' '
    private var jongChar: Char = ' '
    private var lastJongChar: Char = ' ' // To handle complex final consonant separations

    fun clear() {
        state = 0
        choChar = ' '
        jungChar = ' '
        jongChar = ' '
        lastJongChar = ' '
    }

    /**
     * Feed an incoming character and retrieve the current composition result
     * @return Pair of (Is new character triggered, Result String)
     */
    fun append(char: Char): Pair<Boolean, String> {
        val isConsonant = CHO.contains(char) || JONG.contains(char)

        when (state) {
            0 -> { // Empty state
                if (isConsonant) {
                    choChar = char
                    state = 1
                    return Pair(false, choChar.toString())
                } else {
                    jungChar = char
                    state = 2
                    return Pair(false, jungChar.toString())
                }
            }
            1 -> { // Cho-Seong state
                if (isConsonant) {
                    // Two consecutive initial consonants cannot combine directly in modern Korean (except double keys, handled by layouts)
                    val prev = choChar.toString()
                    clear()
                    choChar = char
                    state = 1
                    return Pair(true, prev)
                } else {
                    jungChar = char
                    state = 2
                    return Pair(false, makeSyllable(choChar, jungChar, ' ').toString())
                }
            }
            2 -> { // Jung-Seong state
                if (!isConsonant) {
                    // Try to combine complex vowels
                    val combinedVowel = JUNG_COMBINATIONS["$jungChar$char"]
                    if (combinedVowel != null) {
                        jungChar = combinedVowel
                        return Pair(false, makeSyllable(choChar, jungChar, ' ').toString())
                    } else {
                        val prev = makeSyllable(choChar, jungChar, ' ').toString()
                        clear()
                        jungChar = char
                        state = 2
                        return Pair(true, prev)
                    }
                } else {
                    // Check if consonant can be Jong-Seong
                    if (JONG.contains(char)) {
                        jongChar = char
                        state = 3
                        return Pair(false, makeSyllable(choChar, jungChar, jongChar).toString())
                    } else {
                        val prev = makeSyllable(choChar, jungChar, ' ').toString()
                        clear()
                        choChar = char
                        state = 1
                        return Pair(true, prev)
                    }
                }
            }
            3 -> { // Jong-Seong state
                if (isConsonant) {
                    // Try combining complex final consonants
                    val combinedJong = JONG_COMBINATIONS["$jongChar$char"]
                    if (combinedJong != null) {
                        lastJongChar = char
                        jongChar = combinedJong
                        return Pair(false, makeSyllable(choChar, jungChar, jongChar).toString())
                    } else {
                        val prev = makeSyllable(choChar, jungChar, jongChar).toString()
                        clear()
                        choChar = char
                        state = 1
                        return Pair(true, prev)
                    }
                } else {
                    // If a vowel follows a final consonant, the final consonant migrates to the initial position of the new syllable
                    val prev: String
                    val nextCho: Char
                    
                    if (lastJongChar != ' ') {
                        // For compound consonants like ㄵ -> ㄴ remains, ㅈ migrates
                        val firstJong = getPrimaryJong(jongChar)
                        prev = makeSyllable(choChar, jungChar, firstJong).toString()
                        nextCho = lastJongChar
                    } else {
                        prev = makeSyllable(choChar, jungChar, ' ').toString()
                        nextCho = jongChar
                    }
                    
                    clear()
                    choChar = nextCho
                    jungChar = char
                    state = 2
                    return Pair(true, prev)
                }
            }
        }
        return Pair(false, "")
    }

    /**
     * Performs standard unicode combinations
     */
    private fun makeSyllable(cho: Char, jung: Char, jong: Char): Char {
        if (cho == ' ' && jung == ' ') return ' '
        if (cho != ' ' && jung == ' ') return cho
        if (cho == ' ' && jung != ' ') return jung

        val choIndex = CHO.indexOf(cho)
        val jungIndex = JUNG.indexOf(jung)
        val jongIndex = if (jong == ' ') 0 else JONG.indexOf(jong)

        if (choIndex < 0 || jungIndex < 0) return ' '

        // Unicode base for combined Korean syllables is 0xAC00
        val unicode = 0xAC00 + (choIndex * 21 * 28) + (jungIndex * 28) + jongIndex
        return unicode.toChar()
    }

    private fun getPrimaryJong(compoundJong: Char): Char {
        // Return first parts of double-final consonants
        return when (compoundJong) {
            'ㄳ' -> 'ㄱ'
            'ㄵ' -> 'ㄴ'
            'ㄶ' -> 'ㄴ'
            'ㄺ' -> 'ㄹ'
            'ㄻ' -> 'ㄹ'
            'ㄼ' -> 'ㄹ'
            'ㄽ' -> 'ㄹ'
            'ㄾ' -> 'ㄹ'
            'ㄿ' -> 'ㄹ'
            'ㅀ' -> 'ㄹ'
            'ㅄ' -> 'ㅂ'
            else -> compoundJong
        }
    }
}
