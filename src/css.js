/**
 * CSSify animations
 * @param {Array} animations
 * @constructor
 */
function CSS(item, animations) {
  this.stylesheet = document.styleSheets[0]

  this.item = item
  this.animations = animations

  this.total = this.animations.map(function(a){
    return a.delay + a.duration
  }).reduce(function(a, b){
    return a + b
  })

  this.style()
}

/**
 * Pauses CSS animation
 */
CSS.prototype.pause = function pause() {
  this.item.dom.style[animationProperty + 'PlayState'] = 'paused'
  return this
}

/**
 * Resumes CSS animation
 */
CSS.prototype.resume = function resume() {
  this.item.dom.style[animationProperty + 'PlayState'] = 'running'
  return this
}

/**
 * Stops CSS animation
 * parses current transformation matrix
 * extracts values and sets item state
 */
CSS.prototype.stop = function stop() {
  var style = getComputedStyle(this.item.dom),
      transform = style[vendor + 'transform'],
      opacity = style.opacity

  this.item.dom.style[animationProperty] = ''
  this.item.dom.style[transitionProperty] = ''

  this.item.dom.style[transformProperty] = transform
  this.item.dom.style.opacity = opacity

  this.item.state = Matrix.extract(Matrix.parse(transform))
  this.item.state.opacity = opacity
  return this
}


CSS.prototype.handle = function handle(event) {
  var vendor = window.vendor.replace(/\-/g, ''),
      onEnd = function end() {
        this.stop()
        this.item.dom.removeEventListener(vendor + event, onEnd, false)
      }.bind(this)
  this.item.dom.addEventListener(vendor + event, onEnd, false)
}

/**
 * Applies animations and sets item style
 */
CSS.prototype.style = function style() {
  var animation = 'a' + (Date.now() + Math.floor(Math.random() * 100))

  if (this.item.animations[0] instanceof Animation &&
    this.item.animations.length == 1) { // transition
    var a = this.item.animations[0]
    a.init()
    this.item.dom.style[transitionProperty] = 'all ' + a.duration + 'ms ' + easings.css[a.easeName] + ' ' + a.delay + 'ms'
    a.transform(1)
    this.handle('TransitionEnd')
    a.item.style()
  } else { // animation
    this.stylesheet.insertRule(this.keyframes(animation), 0)
    this.handle('AnimationEnd')
    this.item.dom.style[animationProperty] = animation + ' ' + this.total + 'ms' + (this.item.infinite ? ' infinite ' : ' ') + 'forwards'
  }

  this.item.animations = []
}

/**
 * Generates @keyframes based on animations
 * @param {String} name Animation name
 * @return {String}
 */
CSS.prototype.keyframes = function keyframes(name) {
  var time = 0,
      rule = ['@' + vendor + 'keyframes ' + name + '{']

  for (var i = 0; i < this.animations.length; i++) {
    var a = this.animations[i],
        aNext = this.animations[i+1]

    a.init()

    if (a instanceof Animation) { // Single
      i === 0 && rule.push(this.frame(0, easings.css[a.easeName]))

      a.delay && rule.push(this.frame(time += a.delay))

      a.transform(1)

      rule.push(this.frame(time += a.duration, aNext && easings.css[aNext.easeName]))
    } else { // Parallel (it doesn't work with custom easings for now)
      var frames = []
      a.animations.forEach(function(a){
        a.delay && frames.indexOf(a.delay) === -1 && frames.push(a.delay)
        a.duration && frames.indexOf(a.delay + a.duration) === -1 && frames.push(a.delay + a.duration)
      })

      for (var k = 0; k < frames.length; ++k) {
        var frame = frames[k]
        for (var j = 0; j < a.animations.length; ++j) {
          var pa = a.animations[j]
          // it's animation start or it's already ended
          if (pa.delay >= frame || pa.delay + pa.duration < frame)
            continue
          pa.transform(pa.ease((frame - pa.delay) / pa.duration))
        }

        rule.push(this.frame(time += frame))
      }
    }
  }
  rule.push('}')
  return rule.join('')
}

/**
 * Calcuates percent for keyframes
 * @param {number} time
 * @return {String}
 */
CSS.prototype.percent = function percent(time) {
  return (time * 100 / this.total).toFixed(3)
}

/**
 * Generates one frame for @keyframes
 * @param {number} time
 * @param {number} ease
 * @return {String}
 */
CSS.prototype.frame = function frame(time, ease) {
  var percent = this.percent(time)
  return percent + '% {' +
    (percent ? vendor + 'transform:' + this.item.matrix() + ';' : '') +
    (percent ? 'opacity:' + this.item.opacity() + ';' : '') +
    (ease ? vendor + 'animation-timing-function:' + ease + ';' : '') +
    '}'
}
