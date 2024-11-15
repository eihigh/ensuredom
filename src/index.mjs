Node.prototype._appendChild = Node.prototype.appendChild;
Node.prototype.appendChild = function () {
	delete this._keys;
	this._appendChild(...arguments);
}
Node.prototype._insertBefore = Node.prototype.insertBefore;
Node.prototype.insertBefore = function () {
	delete this._keys;
	this._insertBefore(...arguments);
}
Node.prototype._removeChild = Node.prototype.removeChild;
Node.prototype.removeChild = function () {
	delete this._keys;
	this._removeChild(...arguments);
}
Node.prototype._replaceChild = Node.prototype.replaceChild;
Node.prototype.replaceChild = function () {
	delete this._keys;
	this._replaceChild(...arguments);
}

Element.prototype._after = Element.prototype.after;
Element.prototype.after = function () {
	delete this.parentNode._keys;
	this._after(...arguments);
}
Element.prototype._append = Element.prototype.append;
Element.prototype.append = function () {
	delete this._keys;
	this._append(...arguments);
}
Element.prototype._before = Element.prototype.before;
Element.prototype.before = function () {
	delete this.parentNode._keys;
	this._before(...arguments);
}
Element.prototype._prepend = Element.prototype.prepend;
Element.prototype.prepend = function () {
	delete this._keys;
	this._prepend(...arguments);
}
Element.prototype._remove = Element.prototype.remove;
Element.prototype.remove = function () {
	delete this.parentNode._keys;
	this._remove(...arguments);
}
Element.prototype._replaceChildren = Element.prototype.replaceChildren;
Element.prototype.replaceChildren = function () {
	delete this._keys;
	this._replaceChildren(...arguments);
}
Element.prototype._replaceWith = Element.prototype.replaceWith;
Element.prototype.replaceWith = function () {
	delete this.parentNode._keys;
	this._replaceWith(...arguments);
}

let _t = 1;
let _willCleanup = false;
const _marks = new Set();

function _cleanup() {
	// collect elements with the minimum depth
	let minDepth = Infinity;
	let minDepthElems = [];

	for (const elem of _marks) {
		// measure depth
		let depth = 0;
		let parent = elem.parentElement;
		while (parent != null) {
			if (parent._t === _t) {
				depth = Infinity;
				break;
			}
			depth++;
			parent = parent.parentElement;
		}
		// collect elements with the minimum depth
		if (depth < minDepth) {
			minDepth = depth;
			minDepthElems = [elem];
		} else if (depth === minDepth) {
			minDepthElems.push(elem);
		}
	}

	// cleanup elements recursively
	for (const elem of minDepthElems) {
		_cleanupElem(elem);
	}

	_willCleanup = false;
	_marks.clear();
	_t++;
}

function _cleanupElem(elem) {
	if (elem._tHasDynamicChildren === _t) {
		// remove elements and text nodes
		let child = elem.firstChild;
		while (child != null) {
			if (child._t === _t) {
				// keep new child
				child = child.nextSibling;
				continue;
			}
			if (child.nodeType === Node.ELEMENT_NODE && !child.hasAttribute("key")) {
				// keep unkeyed element
				child = child.nextSibling;
				continue;
			}
			// remove outdated child
			const outdated = child;
			child = child.nextSibling;
			elem._removeChild(outdated);
		}
	} else {
		// remove elements
		let child = elem.firstElementChild;
		while (child != null) {
			if (child._t === _t) {
				// keep new child
				child = child.nextElementSibling;
				continue;
			}
			if (!child.hasAttribute("key")) {
				// keep unkeyed element
				child = child.nextElementSibling;
				continue;
			}
			// remove outdated child
			const outdated = child;
			child = child.nextElementSibling;
			elem._removeChild(outdated);
		}
	}

	let child = elem.firstElementChild;
	while (child != null) {
		_cleanupElem(child); // recursive
		child = child.nextElementSibling;
	}
}

export function ensure(parent, tagName, key) {
	parent._tHasDynamicChildren = _t;

	// cleanup on the next microtask
	if (!_willCleanup) {
		_willCleanup = true;
		queueMicrotask(_cleanup);
	}

	// collect keys of server-rendered children
	if (parent._keys == null) {
		parent._keys = new Map();
		let child = parent.firstElementChild;
		while (child != null) {
			if (child.hasAttribute("key")) {
				parent._keys.set(child.getAttribute("key"), child);
			}
			child = child.nextElementSibling;
		}
	}

	// auto key generation
	if (key == null) {
		// initialize or clear tag counts
		if (parent._tagCounts == null) {
			parent._tTagCounts = _t;
			parent._tagCounts = new Map();
		} else if (parent._tTagCounts !== _t) {
			parent._tTagCounts = _t;
			parent._tagCounts.clear();
		}
		// generate key
		const tagCount = parent._tagCounts.get(tagName) || 0;
		key = `auto ${tagName} ${tagCount}`;
		parent._tagCounts.set(tagName, tagCount + 1);
	} else if (typeof key !== "string") {
		key = key.toString();
	}

	// initialize cursor
	if (parent._tCursor !== _t) {
		parent._tCursor = _t;
		parent._cursor = parent.firstElementChild;
	}

	// return existing child
	if (parent._keys.has(key)) {
		const child = parent._keys.get(key);
		child._t = _t;

		if (parent._t !== _t) {
			// mark as the root of the cleanup range on the tree
			_marks.add(child);

		} else {
			// skip to the next keyed element
			while (parent._cursor != null) {
				if (parent._cursor.nodeType === Node.ELEMENT_NODE && parent._cursor.hasAttribute("key")) {
					break;
				}
				parent._cursor = parent._cursor.nextElementSibling;
			}

			// insert child after the cursor
			if (parent._cursor !== child) {
				const next = parent._cursor == null ? null : parent._cursor.nextSibling;
				parent._insertBefore(child, next);
			}

			// move the cursor to the next of the child
			parent._cursor = child.nextSibling;
		}

		return child;
	}

	// create new child
	const child = document.createElement(tagName);
	child._t = _t;
	child.setAttribute("key", key);
	parent._keys.set(key, child);

	if (parent._t !== _t) {
		// mark as the root of the cleanup range on the tree
		_marks.add(child);
		parent._appendChild(child);

	} else {
		// insert child after the cursor
		const next = parent._cursor == null ? null : parent._cursor.nextSibling;
		parent._insertBefore(child, next);

		// move the cursor to the next of the child
		if (next != null) {
			parent._cursor = child.nextSibling;
		}
	}

	return child;
};

export function ensureText(parent, text) {
	parent._tHasDynamicChildren = _t;

	// if (parent._cursor.nodeType === Node.TEXT_NODE && parent._cursor._t == null) {
	// 	parent._cursor.textContent = text;
	// 	parent._cursor._t = _t;
	// 	const node = parent._cursor;
	// 	parent._cursor = parent._cursor.nextSibling;
	// 	return node;
	// }

	// create new child
	const node = document.createTextNode(text);
	node._t = _t;

	// insert child after the cursor
	const next = parent._cursor == null ? null : parent._cursor.nextSibling;
	parent._insertBefore(node, next);

	// move the cursor to the next of the child
	if (next != null) {
		parent._cursor = node.nextSibling;
	}

	return node;
}

const IS_NON_DIMENSIONAL = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i;

function setStyle(style, key, value) {
	if (key[0] === '-') {
		style.setProperty(key, value == null ? '' : value);
	} else if (value == null) {
		style[key] = '';
	} else if (typeof value != 'number' || IS_NON_DIMENSIONAL.test(key)) {
		style[key] = value;
	} else {
		style[key] = value + 'px';
	}
}

function _applyProps(elem, props) {
	if (props == null) { return; }

	if (elem._listened == null) {
		elem._listened = new Set();
	}

	for (const key in props) {
		const value = props[key];
		if (key === "key") {
			continue;
		} else if (key === "style") {
			const style = elem.style;
			if (typeof value === "string") {
				style.cssText = value;
			} else {
				for (const key in value) {
					setStyle(style, key, value[key]);
				}
			}
		} else if (key.startsWith("on")) {
			const event = key.slice(2).toLowerCase();
			if (!elem._listened.has(event)) {
				elem.addEventListener(event, value);
			}
			elem._listened.add(event);
		} else if (key in elem) {
			elem[key] = value;
		} else if (value == null) {
			elem.removeAttribute(key);
		} else {
			elem.setAttribute(key, value);
		}
	}
}

function _applyChildren(elem, ...children) {
	for (const child of children) {
		if (typeof child === "function") {
			child(elem);
		} else if (Array.isArray(child)) {
			_applyChildren(elem, ...child);
		} else if (typeof child === "string") {
			useText(elem, child);
		} else if (child != null) {
			useText(elem, child.toString());
		}
	}
}

const React = {
	createElement: (type, props, ...children) => {
		if (typeof type === "function") {
			return (parent) => {
				type(parent, props, ...children);
			};
		}
		return (parent) => {
			const elem = use(parent, type, props ? props.key : null);
			elem._tHasDynamicChildren = _t;
			_applyProps(elem, props);
			_applyChildren(elem, ...children);
			return elem;
		};
	},
};
