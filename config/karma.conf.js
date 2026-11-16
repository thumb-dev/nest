basePath = '../';

files = [
	JASMINE,
	JASMINE_ADAPTER,
	'nest/lib/angular/angular.1.1.5.js',
	'nest/lib/angular/angular-*.min.js',
	'test/lib/angular/angular-mocks.js',
    'nest/lib/angular/ui-validate.js',
    'nest/lib/angular/ui-mask.js',
    'nest/lib/jquery-2.0.0.js',
	'nest/js/app.js',
	'nest/js/**/*.js',

	'config/Four51APIAppName.js',
	'test/unit/appSpec.js',
    'test/unit/filtersSpec.js',
    'test/unit/451Spec.js',
    'test/unit/directivesSpec.js',
    'test/unit/routingSpec.js',
    'test/unit/categorySpec.js',
    'test/unit/addressSpec.js',
    'test/unit/messagesSpec.js',
    'test/unit/productSpec.js'

];

autoWatch = true;

browsers = ['Chrome'];

junitReporter = {
	outputFile: 'test_out/unit.xml',
	suite: 'unit'
};
