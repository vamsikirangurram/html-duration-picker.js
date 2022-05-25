/* global PICKER_STYLES_CSS_CONTENTS */

export default (function () {
  const pickerStyles = PICKER_STYLES_CSS_CONTENTS;

  /**
   * Get current cursor selection
   * @param {Event} event
   * @return {{cursorSelection: 'hours' | 'minutes' | 'seconds',
   *  hourMarker: Number, minuteMarker: Number, content: String}}
   */

  const getCursorSelection = (event) => {
    const {
      target: {
        selectionStart,
        selectionEnd,
        value,
      },
    } = event;
    const daysMarker = value.indexOf(' | ');
    const hourMarker = value.indexOf(':');
    const minuteMarker = value.lastIndexOf(':');
    const secondsMarker = value.indexOf('.');
    let cursorSelection;
    // The cursor selection is: days
    if (selectionStart <= daysMarker) {
      cursorSelection = 'days';
    } else if (selectionStart <= hourMarker) {
      // The cursor selection is: hours
      cursorSelection = 'hours';
    } else if (selectionStart <= minuteMarker) {
      // The cursor selection is: minutes
      cursorSelection = 'minutes';
    } else if (selectionStart <= secondsMarker) {
      // The cursor selection is: seconds
      cursorSelection = 'seconds';
    } else if (selectionStart > secondsMarker) {
      // The cursor selection is: milliseconds
      cursorSelection = 'milliseconds';
    }
    const content = value.slice(selectionStart, selectionEnd);
    return {
      cursorSelection,
      daysMarker,
      hourMarker,
      minuteMarker,
      secondsMarker,
      content,
    };
  };

  const getSectioned = (value) => {
    const partitions = value.split(' | ');
    const sect1 = partitions[0];
    const sect2 = partitions[1].split('.');
    const sect3 = sect2[0].split(':');
    const sectioned = [sect1, ...sect3, sect2[1]];
    return sectioned;
  };

  /**
   * Set the 'data-adjustment-factor' attribute for a picker
   * @param {*} inputBox
   * @param {3600 | 60 | 1} adjustmentFactor
   */
  const updateActiveAdjustmentFactor = (inputBox, adjustmentFactor) => {
    inputBox.setAttribute('data-adjustment-factor', adjustmentFactor);
  };

  const handleInputFocus = (event) => {
    // get input selection
    const inputBox = event.target;
    const {
      maxDuration,
    } = getMinMaxConstraints(inputBox);
    const maxHourInput = Math.floor(maxDuration / 3600);
    const charsForHours = maxHourInput < 1 ? 0 : maxHourInput.toString().length;

    /* this is for firefox and safari, when you focus using tab key, both selectionStart
    and selectionEnd are 0, so manually trigger hour seleciton. */
    if (
      (event.target.selectionEnd === 0 && event.target.selectionStart === 0) ||
      event.target.selectionEnd - event.target.selectionStart > charsForHours ||
      charsForHours === 0
    ) {
      setTimeout(() => {
        inputBox.focus();
        inputBox.select();
        highlightTimeUnitArea(inputBox, 3600 * 24 * 1000);
      }, 1);
    }
  };
  /**
   * Gets the position of the cursor after a click event, then matches to
   * time interval (hh or mm or ss) and selects (highlights) the entire block
   * @param {Event} event - focus/click event
   * @return {void}
   */
  const handleClickFocus = (event) => {
    const inputBox = event.target;
    // Gets the cursor position and select the nearest time interval
    const {
      cursorSelection,
      daysMarker,
      hourMarker,
      minuteMarker,
      secondsMarker,
    } = getCursorSelection(event);

    // Something is wrong with the duration format.
    if (!cursorSelection) {
      return;
    }

    const cursorAdjustmentFactor = 0;
    switch (cursorSelection) {
      case 'days':
        updateActiveAdjustmentFactor(inputBox, 3600000 * 24);
        event.target.setSelectionRange(0, daysMarker);
        return;
      case 'hours':
        updateActiveAdjustmentFactor(inputBox, 3600000);
        event.target.setSelectionRange(daysMarker + 3, hourMarker);
        return;
      case 'minutes':
        updateActiveAdjustmentFactor(inputBox, 60000);
        event.target.setSelectionRange(hourMarker + 1, minuteMarker + cursorAdjustmentFactor);
        return;
      case 'seconds':
        updateActiveAdjustmentFactor(inputBox, 1000);
        event.target.setSelectionRange(minuteMarker + 1, minuteMarker + 3);
        return;
      case 'milliseconds':
        updateActiveAdjustmentFactor(inputBox, 1);
        event.target.setSelectionRange(secondsMarker + 1, secondsMarker + 4);
        return;
      default:
        updateActiveAdjustmentFactor(inputBox, 1);
        event.target.setSelectionRange(secondsMarker + 1, secondsMarker + 4);
        return;
    }
  };

  /**
   * Manually creates and fires an Event
   * @param {*} type
   * @param {*} option - event options
   * @return {Event}
   */
  const createEvent = (type, option = {
    bubbles: false,
    cancelable: false,
  }) => {
    if (typeof Event === 'function') {
      return new Event(type);
    } else {
      const event = document.createEvent('Event');
      event.initEvent(type, option.bubbles, option.cancelable);
      return event;
    }
  };

  /**
   *
   * @param {*} inputBox
   * @param {Number} milliSecondsValue value in seconds
   * @param {Boolean} dispatchSyntheticEvents whether to manually fire 'input' and 'change' event for other event listeners to get it
   */
  const insertFormatted = (inputBox, milliSecondsValue, dispatchSyntheticEvents) => {
    const formattedValue = milliSecondsToDuration(milliSecondsValue);
    const existingValue = inputBox.value;
    // Don't use setValue method here because
    // it breaks the arrow keys and arrow buttons control over the input
    inputBox.value = formattedValue;

    // manually trigger an "input" event for other event listeners
    if (dispatchSyntheticEvents !== false) {
      if (existingValue != formattedValue) {
        inputBox.dispatchEvent(createEvent('change', {
          bubbles: true,
          cancelable: true,
        }));
      }
      inputBox.dispatchEvent(createEvent('input'));
    }
  };

  /**
   * Highlights/selects the time unit area hh, mm or ss of a picker
   * @param {*} inputBox
   * @param {86400000 | 3600000 | 60000 | 1000 | 1} adjustmentFactor
   * @param {Boolean} forceInputFocus
   */
  const highlightTimeUnitArea = (inputBox, adjustmentFactor) => {
    const daysMarker = inputBox.value.indexOf(' | ');
    const hourMarker = inputBox.value.indexOf(':');
    const minuteMarker = inputBox.value.lastIndexOf(':');
    const secondsMarker = inputBox.value.indexOf('.');
    const sectioned = getSectioned(inputBox.value);

    if (adjustmentFactor >= 60 * 60 * 24 * 1000) {
      inputBox.selectionStart = 0; // days mode
      inputBox.selectionEnd = daysMarker;
    } else if (adjustmentFactor >= 60 * 60 * 1000) {
      inputBox.selectionStart = daysMarker + 3; // hours mode
      inputBox.selectionEnd = daysMarker + 3 + sectioned[1].length;
    } else if (adjustmentFactor >= 60 * 1000) {
      inputBox.selectionStart = hourMarker + 1; // minutes mode
      inputBox.selectionEnd = hourMarker + 1 + sectioned[2].length;
      // inputBox.selectionEnd = minuteMarker + 3;
    } else if (adjustmentFactor >= 1000) {
      inputBox.selectionStart = minuteMarker + 1; // seconds mode
      inputBox.selectionEnd = minuteMarker + 1 + sectioned[3].length;
      // inputBox.selectionEnd = minuteMarker + 3;
    } else {
      inputBox.selectionStart = secondsMarker + 1; // milliseconds mode
      inputBox.selectionEnd = secondsMarker + 1 + sectioned[4].length;
      // inputBox.selectionEnd = hourMarker + 3;
      adjustmentFactor = 1;
    }

    if (adjustmentFactor >= 1 && adjustmentFactor <= 3600000 * 24) {
      inputBox.setAttribute('data-adjustment-factor', adjustmentFactor);
    }
  };
  // gets the adjustment factor for a picker
  const getAdjustmentFactor = (inputBox) => {
    let adjustmentFactor = 1;
    if (Number(inputBox.getAttribute('data-adjustment-factor')) > 0) {
      adjustmentFactor = Number(inputBox.getAttribute('data-adjustment-factor'));
    }
    console.log(`adjustment: ${adjustmentFactor}`);
    return adjustmentFactor;
  };

  /**
   * set value for a picker
   * @param {*} inputBox
   * @param {*} value
   */
  // eslint-disable-next-line no-unused-vars
  const setValue = (inputBox, value) => {
    // This is a "cross-browser" way to set the input value
    // that doesn't cause the cursor jumping to the end of the input on Safari
    // inputBox.value = value;
    inputBox.setAttribute('value', value);
  };

  /**
   * Increases or decreases duration value by up and down arrow keys
   * @param {*} inputBox
   * @param {'up' | 'down'} direction
   */
  const changeValueByArrowKeys = (inputBox, direction) => {
    const adjustmentFactor = getAdjustmentFactor(inputBox);
    let secondsValue = durationToMilliSeconds(inputBox.value);

    switch (direction) {
      case 'up':
        secondsValue += adjustmentFactor;
        break;
      case 'down':
        secondsValue -= adjustmentFactor;
        if (secondsValue < 0) {
          secondsValue = 0;
        }
        break;
    }
    const constrainedValue = applyMinMaxConstraints(inputBox, secondsValue);
    insertFormatted(inputBox, constrainedValue, false);
  };

  /**
   * shift focus (text selection) between hh, mm, and ss with left and right arrow keys;
   * @param {*} inputBox
   * @param {'left' | 'right'} direction
   */
  const shiftTimeUnitAreaFocus = (inputBox, direction) => {
    const adjustmentFactor = getAdjustmentFactor(inputBox);
    switch (direction) {
      case 'left': {
        let adjustmentMuliplier = 1000;
        if (inputBox.selectionStart == 5) {
          adjustmentMuliplier = 24;
        }
        highlightTimeUnitArea(inputBox, adjustmentFactor < 86400000 ? adjustmentFactor * adjustmentMuliplier : 864000);
        break;
      }
      case 'right': {
        let adjustmentDivisor = 60;
        if (inputBox.selectionStart == 0) {
          adjustmentDivisor = 24;
        }
        highlightTimeUnitArea(inputBox, adjustmentFactor > 60 ? adjustmentFactor / adjustmentDivisor : 1);
        break;
      }
      default:
    }
  };

  /**
   * Checks if a given string value is in valid duration format
   * @param {String} value
   * @param {Boolean} strictMode if set to false, time like 3:3:59 will be considered valid
   * @return {Boolean}
   */
  const isValidDurationFormat = (value, strictMode) => {
    let pattern;
    if (strictMode === false) {
      pattern = '^[0-9]{1,9}:(([0-5][0-9]|[0-5])):(([0-5][0-9]|[0-5]))$';
    } else {
      pattern = '^[0-9]{1,9}:[0-5][0-9]:[0-5][0-9]$';
    }
    const regex = RegExp(pattern);
    return regex.test(value);
  };

  /**
   *  Applies a picker's min and max duration constraints to a given value
   * @param {*} inputBox
   * @param {Number} value in seconds
   * @param {{minDuration: string, maxDuration: string}} constraints
   * @return {Number} number withing the min and max data attributes
   */
  const applyMinMaxConstraints = (inputBox, value) => {
    const {
      maxDuration,
      minDuration,
    } = getMinMaxConstraints(inputBox);
    return Math.min(Math.max(value, minDuration), maxDuration);
  };

  /**
   * Converts seconds to a duration string
   * @param {value} value
   * @return {String}
   */
  const milliSecondsToDuration = (value) => {
    let milliSecondsValue = value;
    const days = Math.floor(milliSecondsValue / 86400000);
    milliSecondsValue %= 86400000;
    const hours = Math.floor(milliSecondsValue / 3600000);
    milliSecondsValue %= 3600000;
    const minutes = Math.floor(milliSecondsValue / 60000);
    milliSecondsValue %= 60000;
    const seconds = Math.floor(milliSecondsValue / 1000);
    milliSecondsValue %= 1000;
    console.log(milliSecondsValue);
    const milliSeconds = Math.round(milliSecondsValue);
    const formattedDays = String(days).padStart(2, '0');
    const formattedHours = String(hours).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');
    const formattedMilliSeconds = String(milliSeconds).padStart(3, '0');
    return `${formattedDays} | ${formattedHours}:${formattedMinutes}:${formattedSeconds}.${formattedMilliSeconds}`;
  };
  /**
   * Converts a given duration string to seconds
   * @param {String} value
   * @return {Number}
   */
  const durationToMilliSeconds = (value) => {
    if (!/:/.test(value)) {
      return 0;
    }
    const daysSeparated = value.split('|');
    const msSeparated = daysSeparated[1].split('.');
    const sectioned = getSectioned(value); // msSeparated[0].split(':');
    if (sectioned.length < 4) {
      return 0;
    } else {
      return (
        Number(msSeparated[1] ? (msSeparated[1] > 999 ? 999 : msSeparated[1]) : 0) +
        Number(sectioned[3] ? (sectioned[3] > 59 ? 59 : sectioned[3]) * 1000 : 0) +
        Number((sectioned[2] > 59 ? 59 : sectioned[2]) * 60 * 1000) +
        Number(sectioned[1] * 60 * 60 * 1000) +
        Number(daysSeparated[0] * 24 * 60 * 60 * 1000)
      );
    }
  };

  /**
   *
   * @param {String} value
   * @param {{minDuration: string, maxDuration: string}} constraints
   * @return {false | String} return false if theres no need to validate, and a string of a modified value if the string neeeded validation
   */
  const validateValue = (value, constraints) => {
    const sectioned = getSectioned(value);
    if (sectioned.length < 2) {
      return '00 | 00:00:00.000';
    }
    let mustUpdateValue;
    // if the input does not have 2 ":" or is like "01:02:03:04:05", then reset the input
    if (sectioned.length !== 5) {
      return '00 | 00:00:00.000'; // fallback to default
    }
    // if hour (hh) input is not a number or negative set it to 0
    if (isNaN(sectioned[0])) {
      sectioned[0] = '00';
      mustUpdateValue = true;
    }
    // if minutes (mm) input is not a number or negative set it to 0
    if (isNaN(sectioned[1]) || sectioned[1] < 0) {
      sectioned[1] = '00';
      mustUpdateValue = true;
    }
    // if minutes (mm) more than 59, set it to 59
    if (sectioned[1] > 59 || sectioned[1].length > 2) {
      sectioned[1] = '59';
      mustUpdateValue = true;
    }
    // if seconds(ss) input is not a number or negative set it to 0
    if (isNaN(sectioned[2]) || sectioned[2] < 0) {
      sectioned[2] = '00';
      mustUpdateValue = true;
    }
    // if seconds (ss) more than 59, set it to 59
    if (sectioned[2] > 59 || sectioned[2].length > 2) {
      sectioned[2] = '59';
      mustUpdateValue = true;
    }
    if (mustUpdateValue) {
      return sectioned.join(':');
    }
    return false;
  };
  /**
   * Handles blur events on pickers, and applies validation only if necessary.
   * @param {Event} event
   * @return {void}
   */
  const handleInputBlur = (event) => {
    const mustUpdateValue = validateValue(event.target.value);
    if (mustUpdateValue !== false) {
      const constrainedValue = applyMinMaxConstraints(
        event.target,
        durationToMilliSeconds(mustUpdateValue),
      );
      event.target.value = milliSecondsToDuration(constrainedValue);
      return;
    }
    const constrainedValue = applyMinMaxConstraints(
      event.target,
      durationToMilliSeconds(event.target.value),
    );
    if (event.target.value != milliSecondsToDuration(constrainedValue)) {
      event.target.value = milliSecondsToDuration(constrainedValue);
    }
  };

  /**
   * Handles any user input attempts into a picker
   * @param {Event} event
   * @return {void}
   */

  const handleUserInput = (event) => {
    const inputBox = event.target;
    const sectioned = getSectioned(inputBox.value);
    const {
      cursorSelection,
    } = getCursorSelection(event);
    if (sectioned.length < 2) {
      const constrainedValue = applyMinMaxConstraints(inputBox, getInitialDuration(inputBox));
      insertFormatted(inputBox, constrainedValue, false);
      return;
    }

    const {
      maxDuration,
    } = getMinMaxConstraints(inputBox);
    const maxHourInput = Math.floor(maxDuration / 3600);
    const charsForHours = maxHourInput < 1 ? 0 : maxHourInput.toString().length;

    const mustUpdateValue = validateValue(event.target.value, false);

    if (mustUpdateValue !== false) {
      const constrainedValue = applyMinMaxConstraints(
        event.target,
        durationToMilliSeconds(mustUpdateValue),
      );
      insertFormatted(event.target, constrainedValue, false);
    }
    // done entering hours, so shift highlight to minutes
    if (
      (charsForHours < 1 && cursorSelection === 'hours') ||
      (sectioned[0].length >= charsForHours && cursorSelection === 'hours')
    ) {
      if (charsForHours < 1) {
        sectioned[0] = '00';
      }
      shiftTimeUnitAreaFocus(inputBox, 'right');
    }

    // done entering minutes, so shift highlight to seconds
    if (sectioned[1].length >= 2 && cursorSelection === 'minutes') {
      shiftTimeUnitAreaFocus(inputBox, 'right');
    }
    // done entering seconds, just highlight seconds
    if (sectioned[2].length >= 2 && cursorSelection === 'seconds') {
      highlightTimeUnitArea(inputBox, 1000);
    }
  };

  const insertAndApplyValidations = (event) => {
    const inputBox = event.target;
    const duration = inputBox.value || inputBox.dataset.duration;
    const milliSecondsValue = durationToMilliSeconds(duration);
    insertFormatted(inputBox, applyMinMaxConstraints(inputBox, milliSecondsValue));
  };

  /**
   * Handles all key down event in the picker. It will also apply validation
   * and block unsupported keys like alphabetic characters
   * @param {*} event
   * @return {void}
   */
  const handleKeydown = (event) => {
    const changeValueKeys = ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Enter'];
    const adjustmentFactor = getAdjustmentFactor(event.target);

    if (changeValueKeys.includes(event.key)) {
      switch (event.key) {
        // use up and down arrow keys to increase value;
        case 'ArrowDown':
          changeValueByArrowKeys(event.target, 'down');
          highlightTimeUnitArea(event.target, adjustmentFactor);
          break;
        case 'ArrowUp':
          changeValueByArrowKeys(event.target, 'up');
          highlightTimeUnitArea(event.target, adjustmentFactor);
          break;
        // use left and right arrow keys to shift focus;
        case 'ArrowLeft':
          shiftTimeUnitAreaFocus(event.target, 'left');
          break;
        case 'ArrowRight':
          shiftTimeUnitAreaFocus(event.target, 'right');
          break;
        case 'Enter':
          insertAndApplyValidations(event);
          event.target.blur();
          break;
        default:
      }
      event.preventDefault();
    }

    // Allow tab to change selection and escape the input
    if (event.key === 'Tab') {
      const adjustmentFactor = getAdjustmentFactor(event.target);
      const rightAdjustValue = 1;
      const direction = event.shiftKey ? 'left' : 'right';
      if (
        (direction === 'left' && adjustmentFactor < 3600) ||
        (direction === 'right' && adjustmentFactor > rightAdjustValue)
      ) {
        /* while the adjustment factor is less than 3600, prevent default shift+tab behavior,
        and move within the inputbox from mm to hh */
        event.preventDefault();
        shiftTimeUnitAreaFocus(event.target, direction);
      }
    }

    // The following keys will be accepted when the input field is selected
    const acceptedKeys = ['Backspace', 'ArrowDown', 'ArrowUp', 'Tab'];
    if (isNaN(event.key) && !acceptedKeys.includes(event.key)) {
      event.preventDefault();
      return false;
    }
    // additional validations:
    const inputBox = event.target;
    // Gets the cursor position and select the nearest time interval
    const {
      cursorSelection,
      content,
    } = getCursorSelection(event);
    const sectioned = event.target.value.split(':');
    const {
      maxDuration,
    } = getMinMaxConstraints(inputBox);
    const maxHourInput = Math.floor(maxDuration / 3600);
    const charsForHours = maxHourInput < 1 ? 0 : maxHourInput.toString().length;
    if (
      (cursorSelection === 'hours' && content.length >= charsForHours) ||
      sectioned[0].length < charsForHours
    ) {
      if (content.length > charsForHours && charsForHours > 0) {
        event.preventDefault();
      }
    } else if ((cursorSelection === 'minutes' && content.length === 2) || sectioned[1].length < 2) {
      if (content.length >= 2 && ['6', '7', '8', '9'].includes(event.key)) {
        event.preventDefault();
      }
    } else if ((cursorSelection === 'seconds' && content.length === 2) || sectioned[2].length < 2) {
      if (content.length >= 2 && ['6', '7', '8', '9'].includes(event.key)) {
        event.preventDefault();
      }
    } else {
      event.preventDefault();
    }
  };

  const getDurationAttributeValue = (inputBox, name, defaultValue) => {
    const value = inputBox.dataset[name];
    if (value && isValidDurationFormat(value)) {
      return durationToMilliSeconds(value);
    } else {
      return defaultValue;
    }
  };

  const cancelDefaultEvent = (event) => event.preventDefault();

  /**
   * Gets the min and max constraints of a picker
   * @param {*} inputBox
   * @return {{minDuration: string, maxDuration: string}} constraints
   */
  const getMinMaxConstraints = (inputBox) => {
    const minDuration = getDurationAttributeValue(inputBox, 'durationMin', 0);
    const maxDuration = getDurationAttributeValue(
      inputBox,
      'durationMax',
      99 * 24 * 60 * 60 * 1000 + 24 * 60 * 60 * 1000 + 59 * 60 * 1000 + 999,
    ); // by default 99|23:59:59.999 is now new max - 8553599999
    return {
      minDuration,
      maxDuration,
    };
  };

  const getInitialDuration = (inputBox) => {
    const duration = getDurationAttributeValue(inputBox, 'duration', 0);
    const milliSecondsValue = durationToMilliSeconds(duration);
    return applyMinMaxConstraints(inputBox, milliSecondsValue);
  };
  /**
   * Initialize all the pickers
   * @param {Boolean} addCSStoHead  add CSS style sheet to document body
   * @return {void}
   */
  const _init = (addCSStoHead) => {
    // append styles to DOM
    if (addCSStoHead) {
      const head = document.head || document.getElementsByTagName('head')[0];
      const style = document.createElement('style');
      head.appendChild(style);
      style.appendChild(document.createTextNode(pickerStyles));
    }

    // Select all of the input fields with the attribute "html-duration-picker"
    const getInputFields = document.querySelectorAll('input.html-duration-picker');
    getInputFields.forEach((inputBox) => {
      // Set the default text and apply some basic styling to the duration picker
      if (!(inputBox.getAttribute('data-upgraded') == 'true')) {
        const currentInputBoxStyle = inputBox.currentStyle || window.getComputedStyle(inputBox);
        const inputBoxRightMargin = currentInputBoxStyle.marginRight;
        const inputBoxLeftMargin = currentInputBoxStyle.marginLeft;
        const inputBoxRightBorder = parseFloat(currentInputBoxStyle.borderRight);
        const inputBoxLeftBorder = parseFloat(currentInputBoxStyle.borderLeft);
        const inputBoxRightPadding = parseFloat(currentInputBoxStyle.paddingRight);
        const inputBoxLeftPadding = parseFloat(currentInputBoxStyle.paddingLeft);
        let totalInputBoxWidth;
        const currentInputBoxWidth = parseFloat(currentInputBoxStyle.width);
        if (currentInputBoxStyle.boxSizing === 'content-box') {
          totalInputBoxWidth =
            currentInputBoxWidth +
            inputBoxRightBorder +
            inputBoxLeftBorder +
            inputBoxRightPadding +
            inputBoxLeftPadding;
        } else {
          totalInputBoxWidth = currentInputBoxWidth + 60;
        }
        inputBox.setAttribute('data-upgraded', true);
        inputBox.setAttribute('data-adjustment-factor', 3600);
        inputBox.setAttribute(
          'pattern',
          '^[0-9]{1,9}|[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-1][0-9][0-9]$',
        );
        if (
          !inputBox.value ||
          !isValidDurationFormat(inputBox.value)
        ) {
          insertFormatted(inputBox, getInitialDuration(inputBox));
        }

        inputBox.setAttribute('aria-label', 'Duration Picker');
        inputBox.addEventListener('keydown', handleKeydown);
        // selects a block of hours, minutes etc (useful when focused by keyboard: Tab)
        inputBox.addEventListener('focus', handleInputFocus);
        // selects a block of hours, minutes etc (useful when clicked on PC or tapped on mobile)
        inputBox.addEventListener('mouseup', handleClickFocus);
        inputBox.addEventListener('change', insertAndApplyValidations);
        // prefer 'input' event over 'keyup' for soft keyboards on mobile
        inputBox.addEventListener('input', handleUserInput);
        inputBox.addEventListener('blur', handleInputBlur);
        inputBox.addEventListener('drop', cancelDefaultEvent);

        // this div wraps around existing input, then appends control div
        const controlWrapper = document.createElement('div');

        // set css classes
        controlWrapper.setAttribute('class', 'html-duration-picker-input-controls-wrapper');
        // set inline styles
        controlWrapper.setAttribute(
          'style',
          `width: ${totalInputBoxWidth}px; margin-left: ${inputBoxLeftMargin}; margin-right: ${inputBoxRightMargin};`,
        );
        // add the div just before the picker
        inputBox.parentNode.insertBefore(controlWrapper, inputBox);
        // move the picker into the wrapper div
        controlWrapper.appendChild(inputBox);
      }
    });
    return true;
  };

  window.addEventListener('DOMContentLoaded', () => _init(true));
  return {
    init: () => _init(true),
    refresh: () => _init(false),
  };
})();
