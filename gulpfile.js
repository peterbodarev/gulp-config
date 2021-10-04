/**
 * kept comments:
 * js:   .js('//!'		'/*!'		'/**'		'/**!')   min.js('/**!')
 * css:   .css('/*!')   min.css(nothing)
 * html:   <!--!        <!--[if        (ex: <!--[if !(IE 8)]><!-->)
 */

let initFile = 'initFile.json';
let saveFolder = 'a project';
let projectName = require('./' + saveFolder + '/' + initFile).projectName;
let projectPath = saveFolder + '/' + projectName + '/';

let project_folder = projectPath + projectName;
let source_folder = projectPath + '#src';

let fs = require('fs');

let srcFiles = 'src';

let path = {
	build: {
		html: project_folder + '/',
		css: project_folder + '/css/',
		js: project_folder + '/',
		minJs: project_folder + '/',
		img: project_folder + '/img/',
		fonts: project_folder + '/fonts/',
		need: project_folder + '/' + srcFiles + '/',
	},
	src: {
		html: [
			source_folder + `/**{*.html,/${srcFiles}/*.html}`,
			'!' + source_folder + '/**/_*.html',
		],
		css: [source_folder + '/scss/*.scss', source_folder + '/scss/_*.scss'],
		js: [
			source_folder + `/**{/js/*.js,/${srcFiles}/*.js}`,
			'!' + source_folder + `/**/{_*,*min}.js`,
		],
		minJs: [
			source_folder + `/**{js,${srcFiles}}/*min.js`,
			// '!' + source_folder + `/${srcFiles}/**/_*min.js`,
			'!' + source_folder + `/**{js,${srcFiles}}/_*min.js`,
		],
		img: source_folder + '/img/**/*.{jpg,png,svg,gif,ico,webp}',
		fonts: source_folder + '/fonts/*.ttf',
		need: [
			source_folder + `/${srcFiles}/**/*`,
			'!' + source_folder + `/${srcFiles}/**/*.{html,js}`,
			// source_folder + `/${srcFiles}/**/*min.js`,
		],
	},
	watch: {
		html: source_folder + '/**/*.html',
		css: source_folder + '/scss/**/*.scss',
		js: [
			source_folder + `/{js,${srcFiles}}/**/*.js`,
			'!' + source_folder + `/{js,${srcFiles}}/**/*min.js`,
		],
		minJs: source_folder + `/{js,${srcFiles}}/**/*min.js`,
		// minJs: source_folder + `/${srcFiles}/**/*min.js`,
		img: source_folder + '/img/**/*.{jpg,png,svg,gif,ico,webp}',
		need: [
			source_folder + `/${srcFiles}/**/*`,
			'!' + source_folder + `/${srcFiles}/**/*.js`,
			// '!' + source_folder + `/${srcFiles}/**/*min.js`,
		],
		// need: [source_folder + `/${srcFiles}/**/*`],
	},
	clean: './' + project_folder + '/',
};

let { src, dest } = require('gulp'),
	gulp = require('gulp'),
	browser_sync = require('browser-sync').create(),
	fileInclude = require('gulp-file-include'),
	del = require('del'),
	scss = require('gulp-sass')(require('sass')),
	autoprefixer = require('gulp-autoprefixer'),
	group_media = require('gulp-group-css-media-queries'),
	clean_css = require('gulp-clean-css'),
	rename = require('gulp-rename'),
	uglify = require('gulp-uglify-es').default,
	imagemin = require('gulp-imagemin'),
	webp = require('gulp-webp'),
	webp_html = require('gulp-webp-html'),
	webp_css = require('gulp-webpcss'),
	svgSprite = require('gulp-svg-sprite'),
	ttf2woff = require('gulp-ttf2woff'),
	ttf2woff2 = require('gulp-ttf2woff2'),
	fonter = require('gulp-fonter'),
	strip = require('gulp-strip-comments'),
	stripCss = require('gulp-strip-css-comments');

function browserSync(params) {
	browser_sync.init({
		server: {
			baseDir: './' + project_folder + '/',
		},
		port: 3000,
		notify: false,
	});
}

function html() {
	return src(path.src.html)
		.pipe(fileInclude())
		.pipe(webp_html())
		.pipe(
			strip({
				trim: true,
				safe: true,
				//to ignore (even multiline) comments <!--[if...   (ex: <!--[if !(IE 8)]><!-->)
				ignore: /\<\!\-\-!(?:.|\n|\r)*?-->/g,
				//to ignore (even multiline) comments <!--!...
			})
		)
		.pipe(dest(path.build.html))
		.pipe(browser_sync.stream());
}

function css() {
	return (
		src(path.src.css)
			.pipe(
				scss({
					outputStyle: 'expanded',
				}).on('error', scss.logError)
			)
			//filter all // comments
			.pipe(group_media())
			.pipe(
				autoprefixer({
					overrideBrowserslist: ['last 5 version'],
					cascade: true,
				})
			)
			.pipe(webp_css({ webpClass: '.webp', noWebpClass: '.no-webp' }))
			.pipe(stripCss())
			//ignore comments (even multiline) /*!... (preserve: true (default))
			.pipe(dest(path.build.css))
			.pipe(stripCss({ preserve: false }))
			//strip all comments
			.pipe(clean_css())
			.pipe(rename({ extname: '.min.css' }))
			.pipe(dest(path.build.css))
			.pipe(browser_sync.stream())
	);
}

let jsPrefix = '_inc_';
function js() {
	return src(path.src.js)
		.pipe(
			fileInclude({
				prefix: jsPrefix,
			})
		)
		.pipe(
			strip({
				trim: true,
				safe: true,
				//ignore comments (even multiline) /*!...
				ignore: /(\/\*\*(\!\s*|\s*)\n([^\*]*(\*[^\/])?)*\*\/)|(\/\/\!.+)/g,
				// ignore documentation comments (/** */ and /**! */)
				// and coments like //!
			})
		)
		.pipe(dest(path.build.js))
		.pipe(
			strip({
				trim: true,
				ignore: /\/\*\*\!\s*\n([^\*]*(\*[^\/])?)*\*\//g,
				// ignore just documentation comments with !(/**! */)
				// and leave for uglify
			})
		)
		.pipe(uglify())
		.pipe(rename({ extname: '.min.js' }))
		.pipe(dest(path.build.js))
		.pipe(browser_sync.stream());
}

function minJs() {
	return src(path.src.minJs)
		.pipe(
			fileInclude({
				prefix: jsPrefix,
			})
		)
		.pipe(
			strip({
				trim: true,
				ignore: /\/\*\*\!\s*\n([^\*]*(\*[^\/])?)*\*\//g,
				// ignore just documentation comments with !(/**! */)
				// and leave for uglify
			})
		)
		.pipe(uglify())
		.pipe(dest(path.build.minJs))
		.pipe(browser_sync.stream());
}

function images() {
	return src(path.src.img)
		.pipe(
			webp({
				quality: 70,
			})
		)
		.pipe(dest(path.build.img))
		.pipe(src(path.src.img))
		.pipe(
			imagemin({
				progressive: true,
				svgoPlugins: [{ removeViewBox: false }],
				interlaced: true,
				optimizationLevel: 3, //0 to 7
			})
		)
		.pipe(dest(path.build.img))
		.pipe(browser_sync.stream());
}

function fonts(params) {
	src(path.src.fonts).pipe(ttf2woff()).pipe(dest(path.build.fonts));
	return src(path.src.fonts).pipe(ttf2woff2()).pipe(dest(path.build.fonts));
}

function need() {
	return src(path.src.need)
		.pipe(dest(path.build.need))
		.pipe(browser_sync.stream());
}

//enter gulp ott2ttf to transform fonts .otf in .ttf (in source file)
gulp.task('otf2ttf', function () {
	return src([source_folder + '/fonts/*.otf'])
		.pipe(fonter({ formats: ['ttf'] }))
		.pipe(dest(source_folder + '/fonts/'));
});

//to call open second terminal when gulp is running and enter command 'gulp svgSprite'
gulp.task('svgSprite', function () {
	return gulp
		.src([source_folder + '/iconsprite/*.svg'])
		.pipe(
			svgSprite({
				mode: {
					stack: {
						sprite: '../icons/icon.svg', //sprite file name
						example: true,
					},
				},
			})
		)
		.pipe(dest(path.build.img));
});

async function fontsStyle(params) {
	let fsPath = source_folder + '/scss/need/fonts.scss';
	let file_content = fs.readFileSync(fsPath);
	if (file_content == '') {
		fs.writeFile(fsPath, '', cb);
		return fs.readdir(path.build.fonts, function (err, items) {
			if (items) {
				let c_fontname;
				for (var i = 0; i < items.length; i++) {
					let fontname = items[i].split('.');
					fontname = fontname[0];
					if (c_fontname != fontname) {
						fs.appendFile(
							fsPath,
							'@include font("' +
								fontname +
								'", "' +
								fontname +
								'", "400", "normal");\r\n',
							cb
						);
					}
					c_fontname = fontname;
				}
				// let fontsFileComment = '';
				let fontsFileComment =
					"// template: @include font(font-family, ***file name***, font-weight, font-style)\r\n// don't modify ***file name*** !!!\r\n// function fontsStyle works just when this file is empty\r\n// This function read font files(.woff & .woff2) from 'path.build.fonts'";
				fs.appendFile(fsPath, '\r\n' + fontsFileComment + '\r\n', cb);
			}
		});
	}
}

function cb() {}

// let watchNeed = need;
let watchNeed = gulp.series((params) => {
	return del(path.clean + srcFiles + '/');
}, need);

function watchFiles(params) {
	gulp.watch([path.watch.html], html);
	gulp.watch([path.watch.css], css);
	gulp.watch(path.watch.js, js);
	gulp.watch([path.watch.minJs], minJs);
	gulp.watch([path.watch.img], images);
	gulp.watch(path.watch.need, watchNeed);
}

function clean(params) {
	return del(path.clean);
}

let build = gulp.series(
	clean,
	need,
	gulp.parallel(js, minJs, css, html, images, fonts),
	fontsStyle
);
let watch = gulp.parallel(build, watchFiles, browserSync);

exports.minJs = minJs;
exports.need = need;
exports.fontsStyle = fontsStyle;
exports.fonts = fonts;
exports.images = images;
exports.js = js;
exports.css = css;
exports.html = html;
exports.build = build;

exports.watch = watch;
exports.default = watch;

//=============================

gulp.task('start', function () {
	return src('empty/**/*').pipe(dest(projectPath));
});

gulp.task('export', async function () {
	// Updating JSON files
	let filePath = './' + saveFolder + '/' + initFile;
	jsonReader(filePath, (err, data) => {
		if (err) {
			console.log('Error reading file:', err);
			return;
		}

		// increase
		data.exportNr += 1;

		fs.writeFile(filePath, JSON.stringify(data, null, 4), (err) => {
			if (err) {
				console.log('Error writing file:', err);
				return;
			}
		});

		a = data.exportNr;
		b = 10;
		let firstDigit = (a / b) >> 0;
		let secondDigit = a % b;
		// console.log(firstDigit.toString() + secondDigit);

		let destPath =
			data.destProjectPath +
			'/' +
			data.projectName +
			'-' +
			firstDigit.toString() +
			secondDigit +
			'-' +
			data.comment +
			'/';

		return src(saveFolder + '/**/*').pipe(dest(destPath));
	});

	function jsonReader(filePath, cb) {
		fs.readFile(filePath, 'utf-8', (err, fileData) => {
			if (err) {
				return cb && cb(err);
			}
			try {
				const object = JSON.parse(fileData);
				return cb && cb(null, object);
			} catch (err) {
				return cb && cb(err);
			}
		});
	}

	// let readFile;
	// read JSON object from file
	// fs.readFile('./' + saveFolder + '/' + initFile, 'utf-8', (err, data) => {
	// 	if (err) {
	// 		throw err;
	// 	}
	// 	// parse JSON object
	// 	// const user = JSON.parse(data);
	// 	readFile = JSON.parse(data);
	// 	// console.log(readFile);
	// 	// print JSON object
	// 	// console.log(user);
	// });
	// console.log(readFile);
});

gulp.task('clean', async function () {
	del('./' + saveFolder + '/*');
	return src('' + initFile).pipe(dest(saveFolder + '/'));
});

//=============================
