(function () {
'use strict';

function appendNode ( node, target ) {
	target.appendChild( node );
}

function insertNode ( node, target, anchor ) {
	target.insertBefore( node, anchor );
}

function detachNode ( node ) {
	node.parentNode.removeChild( node );
}

function createElement ( name ) {
	return document.createElement( name );
}

function createText ( data ) {
	return document.createTextNode( data );
}

function get ( key ) {
	return key ? this._state[ key ] : this._state;
}

function fire ( eventName, data ) {
	var handlers = eventName in this._handlers && this._handlers[ eventName ].slice();
	if ( !handlers ) return;

	for ( var i = 0; i < handlers.length; i += 1 ) {
		handlers[i].call( this, data );
	}
}

function observe ( key, callback, options ) {
	var group = ( options && options.defer ) ? this._observers.pre : this._observers.post;

	( group[ key ] || ( group[ key ] = [] ) ).push( callback );

	if ( !options || options.init !== false ) {
		callback.__calling = true;
		callback.call( this, this._state[ key ] );
		callback.__calling = false;
	}

	return {
		cancel: function () {
			var index = group[ key ].indexOf( callback );
			if ( ~index ) group[ key ].splice( index, 1 );
		}
	};
}

function on ( eventName, handler ) {
	var handlers = this._handlers[ eventName ] || ( this._handlers[ eventName ] = [] );
	handlers.push( handler );

	return {
		cancel: function () {
			var index = handlers.indexOf( handler );
			if ( ~index ) handlers.splice( index, 1 );
		}
	};
}

function dispatchObservers ( component, group, newState, oldState ) {
	for ( var key in group ) {
		if ( !( key in newState ) ) continue;

		var newValue = newState[ key ];
		var oldValue = oldState[ key ];

		if ( newValue === oldValue && typeof newValue !== 'object' ) continue;

		var callbacks = group[ key ];
		if ( !callbacks ) continue;

		for ( var i = 0; i < callbacks.length; i += 1 ) {
			var callback = callbacks[i];
			if ( callback.__calling ) continue;

			callback.__calling = true;
			callback.call( component, newValue, oldValue );
			callback.__calling = false;
		}
	}
}

function renderMainFragment$1 ( root, component ) {
	var p = createElement( 'p' );
	
	appendNode( createText( "foo is " ), p );
	var text1 = createText( root.foo );
	appendNode( text1, p );

	return {
		mount: function ( target, anchor ) {
			insertNode( p, target, anchor );
		},
		
		update: function ( changed, root ) {
			text1.data = root.foo;
		},
		
		teardown: function ( detach ) {
			if ( detach ) {
				detachNode( p );
			}
		}
	};
}

function Nested ( options ) {
	options = options || {};
	
	this._state = options.data || {};

	this._observers = {
		pre: Object.create( null ),
		post: Object.create( null )
	};

	this._handlers = Object.create( null );

	this._root = options._root;
	this._yield = options._yield;

	this._fragment = renderMainFragment$1( this._state, this );
	if ( options.target ) this._fragment.mount( options.target, null );
}

Nested.prototype.get = get;
Nested.prototype.fire = fire;
Nested.prototype.observe = observe;
Nested.prototype.on = on;

Nested.prototype.set = function set ( newState ) {
	var oldState = this._state;
	this._state = Object.assign( {}, oldState, newState );
	
	dispatchObservers( this, this._observers.pre, newState, oldState );
	if ( this._fragment ) this._fragment.update( newState, this._state );
	dispatchObservers( this, this._observers.post, newState, oldState );
};

Nested.prototype.teardown = function teardown ( detach ) {
	this.fire( 'teardown' );

	this._fragment.teardown( detach !== false );
	this._fragment = null;

	this._state = {};
};

var template = (function () {

	return {
		data () {
			return {
				foo: 'bar'
			};
		},
		components: {
			Nested
		}
	};
}());

function renderMainFragment ( root, component ) {
	var h1 = createElement( 'h1' );
	
	appendNode( createText( "the answer is " ), h1 );
	var text1 = createText( root.answer );
	appendNode( text1, h1 );
	var text2 = createText( "\r\n" );
	
	var nested_initialData = {
		foo: root.foo
	};
	var nested = new template.components.Nested({
		target: null,
		_root: component._root || component,
		data: nested_initialData
	});

	return {
		mount: function ( target, anchor ) {
			insertNode( h1, target, anchor );
			insertNode( text2, target, anchor );
			nested._fragment.mount( target, anchor );
		},
		
		update: function ( changed, root ) {
			text1.data = root.answer;
			
			var nested_changes = {};
			
			if ( 'foo' in changed ) nested_changes.foo = root.foo;
			
			if ( Object.keys( nested_changes ).length ) nested.set( nested_changes );
		},
		
		teardown: function ( detach ) {
			nested.teardown( detach );
			
			if ( detach ) {
				detachNode( h1 );
				detachNode( text2 );
			}
		}
	};
}

function App ( options ) {
	options = options || {};
	
	this._state = Object.assign( template.data(), options.data );

	this._observers = {
		pre: Object.create( null ),
		post: Object.create( null )
	};

	this._handlers = Object.create( null );

	this._root = options._root;
	this._yield = options._yield;

	this._renderHooks = [];
	
	this._fragment = renderMainFragment( this._state, this );
	if ( options.target ) this._fragment.mount( options.target, null );
	
	while ( this._renderHooks.length ) {
		var hook = this._renderHooks.pop();
		hook.fn.call( hook.context );
	}
}

App.prototype.get = get;
App.prototype.fire = fire;
App.prototype.observe = observe;
App.prototype.on = on;

App.prototype.set = function set ( newState ) {
	var oldState = this._state;
	this._state = Object.assign( {}, oldState, newState );
	
	dispatchObservers( this, this._observers.pre, newState, oldState );
	if ( this._fragment ) this._fragment.update( newState, this._state );
	dispatchObservers( this, this._observers.post, newState, oldState );
	
	while ( this._renderHooks.length ) {
		var hook = this._renderHooks.pop();
		hook.fn.call( hook.context );
	}
};

App.prototype.teardown = function teardown ( detach ) {
	this.fire( 'teardown' );

	this._fragment.teardown( detach !== false );
	this._fragment = null;

	this._state = {};
};

window.app = new App({
	target: document.querySelector( 'main' ),
	data: {
		answer: 42
	}
});

}());
