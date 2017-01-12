import svelte from 'rollup-plugin-svelte';

export default {
	entry: 'app/main.js',
	dest: 'release/js/bundle.js',
	format: 'iife',
	plugins: [
		svelte()
	]
};