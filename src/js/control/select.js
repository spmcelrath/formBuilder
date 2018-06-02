import control from '../control'

/**
 * Text input class
 * Output a <input type="text" ... /> form element
 */
export default class controlSelect extends control {
  /**
   * definition
   * @return {Object} select control definition
   */
  static get definition() {
    return {
      inactive: ['checkbox'],
      mi18n: {
        minSelectionRequired: 'minSelectionRequired',
      },
    }
  }

  /**
   * build a select DOM element, supporting other jquery text form-control's
   * @return {Object} DOM Element to be injected into the form.
   */
  build() {
    const options = []
    const { values, value, placeholder, type, inline, other, toggle, ...data } = this.config
    const optionType = type.replace('-group', '')
    const isSelect = type === 'select'
    if (data.multiple || type === 'checkbox-group') {
      data.name = data.name + '[]'
    }

    if (type === 'checkbox-group' && data.required) {
      this.onRender = this.groupRequired
    }

    delete data.title

    if (values) {
      // if a placeholder is specified, add it to the top of the option list
      if (placeholder && isSelect) {
        options.push(
          this.markup('option', placeholder, {
            disabled: null,
            selected: null,
          })
        )
      }

      // process the rest of the options
      for (let i = 0; i < values.length; i++) {
        let option = values[i]
        if (typeof option === 'string') {
          option = { label: option, value: option }
        }
        let { label = '', ...optionAttrs } = option
        optionAttrs.id = `${data.id}-${i}`

        // don't select this option if a placeholder is defined
        if (!optionAttrs.selected || placeholder) {
          delete optionAttrs.selected
        }

        // if a value is defined at select level, select this attribute
        if (typeof value !== 'undefined' && optionAttrs.value === value) {
          optionAttrs.selected = true
        }

        if (isSelect) {
          let o = this.markup('option', document.createTextNode(label), optionAttrs)
          options.push(o)
        } else {
          const labelContents = [label]
          let wrapperClass = optionType
          if (inline) {
            wrapperClass += '-inline'
          }
          optionAttrs.type = optionType
          if (optionAttrs.selected) {
            optionAttrs.checked = 'checked'
            delete optionAttrs.selected
          }
          const input = this.markup('input', null, Object.assign({}, data, optionAttrs))
          const labelAttrs = { for: optionAttrs.id }
          label = this.markup('label', labelContents, labelAttrs)
          let output = [input, label]
          if (toggle) {
            labelAttrs.className = 'kc-toggle'
            labelContents.unshift(input, this.markup('span'))
            output = this.markup('label', labelContents, labelAttrs)
          }

          const wrapper = this.markup('div', output, { className: wrapperClass })
          options.push(wrapper)
        }
      }

      // if configured to display an 'other' option, prepare the elements
      if (!isSelect && other) {
        const otherOptionAttrs = {
          id: `${data.id}-other`,
          className: `${data.className} other-option`,
          value: '',
          events: {
            click: () => this.otherOptionCB(otherOptionAttrs.id),
          },
        }
        // let label = mi18n.current.other;
        let wrapperClass = optionType
        if (inline) {
          wrapperClass += '-inline'
        }

        const optionAttrs = Object.assign({}, data, otherOptionAttrs)
        optionAttrs.type = optionType

        const otherValAttrs = {
          type: 'text',
          events: {
            input: evt => {
              const otherInput = evt.target
              const other = otherInput.parentElement.previousElementSibling
              other.value = otherInput.value
            },
          },
          id: `${otherOptionAttrs.id}-value`,
          className: 'other-val',
        }
        const primaryInput = this.markup('input', null, optionAttrs)
        const otherInputs = [document.createTextNode('Other'), this.markup('input', null, otherValAttrs)]
        const inputLabel = this.markup('label', otherInputs, { for: optionAttrs.id })
        const wrapper = this.markup('div', [primaryInput, inputLabel], { className: wrapperClass })
        options.push(wrapper)
      }
    }

    // build & return the DOM elements
    if (type == 'select') {
      this.dom = this.markup(optionType, options, data)
    } else {
      this.dom = this.markup('div', options, { className: type })
    }
    return this.dom
  }

  /**
   * setCustomValidity for checkbox-group
   */
  groupRequired() {
    const checkboxes = this.element.getElementsByTagName('input')
    const setValidity = (checkbox, isValid) => {
      const minReq = control.mi18n('minSelectionRequired', 1)
      if (!isValid) {
        checkbox.setCustomValidity(minReq)
      } else {
        checkbox.setCustomValidity('')
      }
    }
    const toggleRequired = (checkboxes, isValid) => {
      ;[].forEach.call(checkboxes, cb => {
        if (isValid) {
          cb.removeAttribute('required')
        } else {
          cb.setAttribute('required', 'required')
        }
        setValidity(cb, isValid)
      })
    }

    const toggleValid = () => {
      const isValid = [].some.call(checkboxes, cb => cb.checked)
      toggleRequired(checkboxes, isValid)
    }

    for (let i = checkboxes.length - 1; i >= 0; i--) {
      checkboxes[i].addEventListener('change', toggleValid)
    }
    toggleValid()
  }

  /**
   * Callback for 'other' option.
   * Toggles the hidden text area for "other" option.
   * @param  {String} otherId id of the "other" option input
   */
  otherOptionCB(otherId) {
    const otherInput = document.getElementById(otherId)
    const otherInputValue = document.getElementById(`${otherId}-value`)

    if (otherInput.checked) {
      otherInputValue.style.display = 'inline-block'
    } else {
      otherInputValue.style.display = 'none'
    }
  }

  /**
   * onRender callback
   */
  onRender() {
    // Set userData if available
    if (this.config.userData) {
      const selectedOptions = this.config.userData.slice()

      if (this.config.type === 'select') {
        $(this.dom)
          .val(selectedOptions)
          .prop('selected', true)
      } else if (this.config.type.endsWith('-group')) {
        this.dom.querySelectorAll('input').forEach(input => {
          if (input.classList.contains('other-val')) {
            return
          }

          // let foundMatch = false
          for (let i = 0; i < selectedOptions.length; i++) {
            if (input.value === selectedOptions[i]) {
              input.setAttribute('checked', true)
              selectedOptions.splice(i, 1) // Remove this item from the list
              break
            }
          }

          // Did not find a match for the selectedOption, see if this is an "other"
          if (input.id.endsWith('-other')) {
            const otherVal = document.getElementById(`${input.id}-value`)
            // If there is no value to set, don't check the other option
            if (selectedOptions.length === 0) {
              return
            }

            // set the other value
            input.setAttribute('checked', true)
            otherVal.value = input.value = selectedOptions[0]
            // show other value
            otherVal.style.display = 'inline-block'
          }
        })
      }
    }
  }
}

// register this control for the following types & text subtypes
control.register(['select', 'checkbox-group', 'radio-group', 'checkbox'], controlSelect)
