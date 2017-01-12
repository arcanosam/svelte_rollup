import App from './App.html';

window.app = new App({
	target: document.querySelector( 'main' ),
	data: {
		answer: 42
	}
});