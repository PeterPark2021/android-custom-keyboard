package com.smart.keyboard.ime

import android.inputmethodservice.InputMethodService
import android.view.KeyEvent
import android.view.View
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputConnection
import android.widget.LinearLayout
import android.widget.Button
import android.view.Gravity
import android.view.ViewGroup
import android.content.Context
import android.os.Vibrator
import android.os.VibrationEffect
import android.os.Build

/**
 * SmartKeyboardService is a native system-level Input Method Service (IME).
 * Renders the virtual keyboard on Android devices, handles layout switching,
 * and inputs Korean text dynamically via the HangulAutomaton.
 */
class SmartKeyboardService : InputMethodService() {

    private val automaton = HangulAutomaton()
    private var isShiftActive = false

    override fun onCreateInputView(): View {
        val rootLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(android.graphics.Color.parseColor("#0f172a")) // Slate-900 background
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
            setPadding(8, 16, 8, 16)
        }

        // Row 1: QWERTY Hangul Row
        rootLayout.addView(createRow(listOf("ㅂ", "ㅈ", "ㄷ", "ㄱ", "ㅅ", "ㅛ", "ㅕ", "ㅑ", "ㅐ", "ㅔ")))
        
        // Row 2: Home Row
        rootLayout.addView(createRow(listOf("ㅁ", "ㄴ", "ㅇ", "ㄹ", "ㅎ", "ㅗ", "ㅓ", "ㅏ", "ㅣ")))
        
        // Row 3: Shift / Bottom Row / Del
        rootLayout.addView(createRow(listOf("⇧", "ㅋ", "ㅌ", "ㅊ", "ㅍ", "ㅠ", "ㅜ", "ㅡ", "⌫")))
        
        // Row 4: Space & Function Keys
        rootLayout.addView(createSpaceRow())

        return rootLayout
    }

    private fun createRow(keys: List<String>): LinearLayout {
        val row = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply {
                setMargins(0, 4, 0, 4)
            }
        }

        for (key in keys) {
            val keyButton = Button(this).apply {
                text = key
                setTextColor(android.graphics.Color.WHITE)
                setBackgroundColor(android.graphics.Color.parseColor("#1e293b")) // Slate-800 key color
                textSize = 18f
                isAllCaps = false
                
                // Style and padding
                setPadding(0, 16, 0, 16)
                val params = LinearLayout.LayoutParams(
                    0,
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                    1.0f
                ).apply {
                    setMargins(4, 0, 4, 0)
                }
                layoutParams = params

                setOnClickListener {
                    handleKeyPress(key)
                }
            }
            row.addView(keyButton)
        }

        return row
    }

    private fun createSpaceRow(): LinearLayout {
        val row = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply {
                setMargins(0, 4, 0, 4)
            }
        }

        // Language toggle
        val langBtn = Button(this).apply {
            text = "한/영"
            setTextColor(android.graphics.Color.WHITE)
            setBackgroundColor(android.graphics.Color.parseColor("#334155")) // Slate-700 function key
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.5f).apply {
                setMargins(4, 0, 4, 0)
            }
            setOnClickListener {
                triggerHapticFeedback()
                automaton.clear()
            }
        }
        row.addView(langBtn)

        // Space bar
        val spaceBtn = Button(this).apply {
            text = "Space"
            setTextColor(android.graphics.Color.WHITE)
            setBackgroundColor(android.graphics.Color.parseColor("#1e293b"))
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 5.0f).apply {
                setMargins(4, 0, 4, 0)
            }
            setOnClickListener {
                triggerHapticFeedback()
                commitText(" ")
                automaton.clear()
            }
        }
        row.addView(spaceBtn)

        // Enter key
        val enterBtn = Button(this).apply {
            text = "Enter"
            setTextColor(android.graphics.Color.WHITE)
            setBackgroundColor(android.graphics.Color.parseColor("#4f46e5")) // Indigo accent
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.5f).apply {
                setMargins(4, 0, 4, 0)
            }
            setOnClickListener {
                triggerHapticFeedback()
                automaton.clear()
                val ic: InputConnection = currentInputConnection
                ic.sendKeyEvent(KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_ENTER))
                ic.sendKeyEvent(KeyEvent(KeyEvent.ACTION_UP, KeyEvent.KEYCODE_ENTER))
            }
        }
        row.addView(enterBtn)

        return row
    }

    private fun handleKeyPress(key: String) {
        triggerHapticFeedback()
        val ic: InputConnection = currentInputConnection ?: return

        when (key) {
            "⌫" -> {
                // Delete previous character
                ic.deleteSurroundingText(1, 0)
                automaton.clear()
            }
            "⇧" -> {
                isShiftActive = !isShiftActive
                // Update layout shift visual state (toggle capital mappings if English is added)
            }
            else -> {
                // Handle Hangul combining logic
                val char = key[0]
                val (isNew, textToCommit) = automaton.append(char)
                if (isNew) {
                    // Commit the completed syllable, then set composition for active combining state
                    ic.commitText(textToCommit, 1)
                }
                ic.setComposingText(automaton.append(' ').second, 1) // Force compositing update
            }
        }
    }

    private fun commitText(text: String) {
        val ic: InputConnection = currentInputConnection ?: return
        ic.commitText(text, 1)
    }

    private fun triggerHapticFeedback() {
        val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createOneShot(30, VibrationEffect.DEFAULT_AMPLITUDE))
        } else {
            @Suppress("DEPRECATION")
            vibrator.vibrate(30)
        }
    }

    override fun onStartInput(attribute: EditorInfo?, restarting: Boolean) {
        super.onStartInput(attribute, restarting)
        automaton.clear()
    }

    override fun onFinishInput() {
        super.onFinishInput()
        automaton.clear()
    }
}
