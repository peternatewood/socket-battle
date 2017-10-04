module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    uglify: {
      options: { preserveComments: false },
      build: {
        src: [
          'public/audio.js',
          'public/base.js',
          'public/ship.js',
          'public/prerender.js',
          'public/main.js',
        ],
        dest: 'public/battle.min.js'
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.registerTask('default', ['uglify']);
}
