// npm install --save-dev google-closure-compiler yargs
// npm install --save-dev gulp gulp-util gulp-size gulp-header gulp-concat gulp-download gulp-closure-compiler

var gulp = require('gulp'),
    gutil = require('gulp-util'),
    header = require('gulp-header'),
    size = require('gulp-size'),
    concat = require('gulp-concat'),
    download = require('gulp-download'),
    closureCompiler = require('gulp-closure-compiler');

var Paths = {
    Src: './src',
    Vendor: './vendor',
    Rpd: function() { return Paths.Src + '/rpd.js'; },
    Kefir: function() { return Paths.Vendor + '/kefir.min.js'; },
    D3: function() { return Paths.Vendor + '/d3.min.js'; },
    D3Tiny: function() { return Paths.Src + '/d3_tiny.js'; },
    Renderer: function(renderer) { return Paths.Src + '/render/' + renderer; },
    Toolkit: function(toolkit) { return Paths.Src + '/toolkit/' + toolkit + '/toolkit'; },
    ToolkitRenderer: function(toolkit, renderer) { return Paths.Src + '/toolkit/' + toolkit + '/' + renderer; },
    UserToolkit: function(toolkit) { return toolkit; },
    UserToolkitRenderer: function(toolkit, renderer) { return toolkit + '/' + renderer; },
    StyleRenderer: function(style, renderer) { return Paths.Src + '/style/' + style + '/' + renderer; },
    UserStyleRenderer: function(style, renderer) { return style + '/' + renderer; },
    Io: function(io) { return Paths.Src + '/io/' + io; }
}

var argv = require('yargs')
           .array('renderer').array('style').array('toolkit').array('io').boolean('d3')
           .array('user-style').array('user-toolkit')
           .default({
               renderer: [ 'svg' ],
               style: [ 'quartz' ],
               toolkit: [ 'core' ],
               io: [],
               d3: false,
               'user-style': [ ],
               'user-toolkit': [ ],
           })
           .argv;

var pkg = require('./package.json');
var Server = require('karma').Server;

var KARMA_CONF_PATH = 'spec/karma.conf.js';
var CLOSURE_COMPILER_PATH = 'node_modules/google-closure-compiler/compiler.jar';

var VENDOR = [ 'http://rpominov.github.io/kefir/dist/kefir.min.js'/*,
               'http://mohayonao.github.io/timbre.js/timbre.js',
               'http://player-dev.animatron.com/latest/bundle/animatron.min.js'*/ ];

var valueColor = gutil.colors.yellow,
    infoColor = gutil.colors.black;

gulp.task('default', ['build'], function() { });

gulp.task('get-deps', function() {
    download(VENDOR).pipe(gulp.dest('./vendor'));
});

gulp.task('build', ['list-opts', 'concat-css'], function() {
    gutil.log(infoColor('Compiling rpd.js with Closure compiler'));
    gutil.log(infoColor('Sources included:'));
    return gulp.src(logFiles(getJsFiles(argv)))
               .pipe(closureCompiler({
                   compilerPath: './' + CLOSURE_COMPILER_PATH,
                   fileName: 'rpd.js',
                   compilerFlags: {
                       //compilation_level: 'ADVANCED_OPTIMIZATIONS',
                       language_in: 'ECMASCRIPT5'
                   }
               }))
               .pipe(distJsHeader(pkg, argv))
               .pipe(gulp.dest('dist'))
               .pipe(size({ showFiles: true, title: 'Result:' }))
               .on('end', function() {
                   gutil.log(infoColor('Your dist/rpd.js is ready!'));
               });
});

gulp.task('concat-css', function() {
    gutil.log(infoColor('Concatenating rpd.css'));
    return gulp.src(logFiles(getCssFiles(argv)))
               .pipe(concat('rpd.css'))
               .pipe(distCssHeader(pkg, argv))
               .pipe(gulp.dest('dist'))
               .pipe(size({ showFiles: true, title: 'Result:' }))
               .on('end', function() {
                   gutil.log(infoColor('Your dist/rpd.css is ready!'));
               });
});

gulp.task('test', function(done) {
    new Server({
        configFile: __dirname + '/' + KARMA_CONF_PATH,
        singleRun: true
    }, done).start();
});

gulp.task('list-opts', function() {
    gutil.log(infoColor('Selected Renderers (--renderer):'),
              argv.renderer.length ? valueColor(argv.renderer.join(', ')) : '[None]');
    gutil.log(infoColor('Selected Styles (--style):'),
              argv.style.length ? valueColor(argv.style.join(', ')) : '[None]');
    gutil.log(infoColor('Selected Toolkits (--toolkit):'),
              argv.toolkit.length ? valueColor(argv.toolkit.join(', ')) : '[None]');
    gutil.log(infoColor('Selected I/O Modules (--io):'),
              argv.io.length ? valueColor(argv.io.join(', ')) : '[None]');
    gutil.log(infoColor('d3.js or d3_tiny.js (--d3):'),
              valueColor(argv.d3 ? 'd3.js (external)' : 'd3_tiny.js'));
    gutil.log(infoColor('Selected User Styles (--user-style):'),
              argv['user-style'].length ? valueColor(argv['user-style'].join(', ')) : '[None]');
    gutil.log(infoColor('Selected User Toolkits (--user-toolkit):'),
              argv['user-toolkit'].length ? valueColor(argv['user-toolkit'].join(', ')) : '[None]');
});

gulp.task('html-head', ['list-opts'], function() {
    getHtmlHead(argv);
});

// Helpers =====================================================================

function distJsHeader(pkg, options) {
    var banner = ['/**',
    ' * <%= pkg.name %> - <%= pkg.description %>',
    ' *',
    ' * @version v<%= pkg.version %>',
    ' * @link <%= pkg.homepage %>',
    ' * @author <%= pkg.author %>',
    ' * @license <%= pkg.license %>',
    ' * ',
    ' * Selected Renderers: ' + (options.renderer.length ? options.renderer.join(', ') : '[None]'),
    ' * Selected Styles: ' + (options.style.length ? options.style.join(', ') : '[None]'),
    ' * Selected Toolkits: ' + (options.toolkit.length ? options.toolkit.join(', ') : '[None]'),
    ' * Selected I/O Modules: ' + (options.io.length ? options.io.join(', ') : '[None]'),
    ' * d3.js or d3_tiny.js: ' + (options.d3 ? 'd3.js (external)' : 'd3_tiny.js'),
    ' *',
    ' * User Styles: ' + (options['user-style'].length ? options['user-style'].join(', ') : '[None]'),
    ' * User Toolkits: ' + (options['user-toolkit'].length ? options['user-toolkit'].join(', ') : '[None]'),
    ' */',
    ''].join('\n');
    return header(banner, { pkg: pkg });
}

function distCssHeader(pkg, options) {
    var banner = ['/**',
    ' * <%= pkg.name %> - <%= pkg.description %>',
    ' *',
    ' * @version v<%= pkg.version %>',
    ' * @link <%= pkg.homepage %>',
    ' * @author <%= pkg.author %>',
    ' * @license <%= pkg.license %>',
    ' * ',
    ' * Selected Renderers: ' + (options.renderer.length ? options.renderer.join(', ') : '[None]'),
    ' * Selected Styles: ' + (options.style.length ? options.style.join(', ') : '[None]'),
    ' * Selected Toolkits: ' + (options.toolkit.length ? options.toolkit.join(', ') : '[None]'),
    ' *',
    ' * User Styles: ' + (options['user-style'].length ? options['user-style'].join(', ') : '[None]'),
    ' * User Toolkits: ' + (options['user-toolkit'].length ? options['user-toolkit'].join(', ') : '[None]'),
    ' */',
    '', ''].join('\n');
    return header(banner, { pkg: pkg });
}

function logFiles(list) {
    list.forEach(function(file) {
        gutil.log(valueColor(file));
    });
    return list;
}

function getCssFiles(options) {
    var list = [];
    options.renderer.forEach(function(renderer) {
        list.push(Paths.Renderer(renderer) + '.css');
    });
    options.style.forEach(function(style) {
        options.renderer.forEach(function(renderer) {
            list.push(Paths.StyleRenderer(style, renderer) + '.css');
        });
    });
    options['user-style'].forEach(function(style) {
        options.renderer.forEach(function(renderer) {
            list.push(Paths.UserStyleRenderer(style, renderer) + '.css');
        });
    });
    options.toolkit.forEach(function(toolkit) {
        options.renderer.forEach(function(renderer) {
            list.push(Paths.ToolkitRenderer(toolkit, renderer) + '.css');
        });
    });
    options['user-toolkit'].forEach(function(toolkit) {
        options.renderer.forEach(function(renderer) {
            list.push(Paths.UserToolkitRenderer(toolkit, renderer) + '.css');
        });
    });
    return list;
}

function getJsFiles(options) {
    var list = [];
    list.push(Paths.Rpd());
    options.io.forEach(function(io) {
        list.push(Paths.Io(io) + '.js');
    });
    if (!options.d3) list.push(Paths.D3Tiny());
    options.style.forEach(function(style) {
        options.renderer.forEach(function(renderer) {
            list.push(Paths.StyleRenderer(style, renderer) + '.js');
        });
    });
    options['user-style'].forEach(function(style) {
        options.renderer.forEach(function(renderer) {
            list.push(Paths.UserStyleRenderer(style, renderer) + '.js');
        });
    });
    options.renderer.forEach(function(renderer) {
        list.push(Paths.Renderer(renderer) + '.js');
    });
    options.toolkit.forEach(function(toolkit) {
        list.push(Paths.Toolkit(toolkit) + '.js');
        options.renderer.forEach(function(renderer) {
            list.push(Paths.ToolkitRenderer(toolkit, renderer) + '.js');
        });
    });
    options['user-toolkit'].forEach(function(toolkit) {
        list.push(Paths.UserToolkit(toolkit) + '.js');
        options.renderer.forEach(function(renderer) {
            list.push(Paths.UserToolkitRenderer(toolkit, renderer) + '.js');
        });
    });
    return list;
}

function getHtmlHead(options) {
    console.log('===========');
    console.log('<head>');
    function comment(comment) {
        console.log('  <!-- ' + comment + ' -->')
    }
    function cssFile(path) {
        console.log('  <link rel="stylesheet" href="' + path + '"></style>');
    }
    function jsFile(path) {
        console.log('  <script src="' + path + '""></script>');
    }
    options.renderer.forEach(function(renderer) {
        comment('RPD Renderer: ' + renderer);
        cssFile(Paths.Renderer(renderer) + '.css');
    });
    options.style.forEach(function(style) {
        options.renderer.forEach(function(renderer) {
            comment('RPD Style: ' + style + ' (' + renderer + ')');
            cssFile(Paths.StyleRenderer(style, renderer) + '.css');
        });
    });
    options['user-style'].forEach(function(style) {
        options.renderer.forEach(function(renderer) {
            comment('RPD User Style: ' + style + ' (' + renderer + ')');
            cssFile(Paths.UserStyleRenderer(style, renderer) + '.css');
        });
    });
    options.toolkit.forEach(function(toolkit) {
        options.renderer.forEach(function(renderer) {
            comment('RPD Toolkit: ' + toolkit + ' (' + renderer + ')');
            cssFile(Paths.ToolkitRenderer(toolkit, renderer) + '.css');
        });
    });
    options['user-toolkit'].forEach(function(toolkit) {
        options.renderer.forEach(function(renderer) {
            comment('RPD User Toolkit: ' + toolkit + ' (' + renderer + ')');
            cssFile(Paths.UserToolkitRenderer(toolkit, renderer) + '.css');
        });
    });
    comment('Kefir'); jsFile(Paths.Kefir());
    comment('RPD'); jsFile(Paths.Rpd());
    options.io.forEach(function(io) {
        comment('RPD I/O: ' + io);
        jsFile(Paths.Io(io) + '.js');
    });
    if (options.d3) {
        comment('d3.js'); jsFile(Paths.D3());
    } else {
        comment('d3_tiny.js'); jsFile(Paths.D3Tiny());
    }
    options.style.forEach(function(style) {
        options.renderer.forEach(function(renderer) {
            comment('RPD Style: ' + style + ' (' + renderer + ')');
            jsFile(Paths.StyleRenderer(style, renderer) + '.js');
        });
    });
    options['user-style'].forEach(function(style) {
        options.renderer.forEach(function(renderer) {
            comment('RPD User Style: ' + style + ' (' + renderer + ')');
            jsFile(Paths.UserStyleRenderer(style, renderer) + '.js');
        });
    });
    options.renderer.forEach(function(renderer) {
        comment('RPD Renderer: ' + renderer);
        jsFile(Paths.Renderer(renderer) + '.js');
    });
    options.toolkit.forEach(function(toolkit) {
        comment('RPD Toolkit: ' + toolkit);
        jsFile(Paths.Toolkit(toolkit) + '.js');
        options.renderer.forEach(function(renderer) {
            comment('RPD Toolkit: ' + toolkit + ' (' + renderer + ')');
            jsFile(Paths.ToolkitRenderer(toolkit, renderer) + '.js');
        });
    });
    options['user-toolkit'].forEach(function(toolkit) {
        comment('RPD User Toolkit: ' + toolkit);
        jsFile(Paths.UserToolkit(toolkit) + '.js');
        options.renderer.forEach(function(renderer) {
            comment('RPD User Toolkit: ' + toolkit + ' (' + renderer + ')');
            jsFile(Paths.UserToolkitRenderer(toolkit, renderer) + '.js');
        });
    });
    console.log('</head>');
    console.log('===========');
}
