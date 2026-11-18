four51.app.controller('Four51Ctrl', ['$scope', '$route', '$timeout', '$location', '$modal', '$resource', 'Punchout', '$451', 'User', 'Order', 'Security', 'OrderConfig', 'Category', 'AppConst','XLATService', 'GoogleAnalytics', 'SpendingAccount', 'GiftItems',
function ($scope, $route, $timeout, $location, $modal, $resource, Punchout, $451, User, Order, Security, OrderConfig, Category, AppConst, XLATService, GoogleAnalytics, SpendingAccount, GiftItems) {
	$scope.AppConst = AppConst;
	$scope.scroll = 0;
	$scope.isAnon = $451.isAnon; //need to know this before we have access to the user object
	$scope.Four51User = Security;
	if ($451.isAnon && !Security.isAuthenticated()) {
		User.login(function () {
			$route.reload();
		});
	}

	// fix Bootstrap fixed-top and fixed-bottom from jumping around on mobile input when virtual keyboard appears
	if ($(window).width() < 960) {
		$(document)
			.on('focus', ':input:not("button")', function (e) {
				$('.navbar-fixed-bottom, .headroom.navbar-fixed-top').css("position", "relative");
			})
			.on('blur', ':input', function (e) {
				$('.navbar-fixed-bottom, .headroom.navbar-fixed-top').css("position", "fixed");
			});
	}

	// http://stackoverflow.com/questions/12592472/how-to-highlight-a-current-menu-item-in-angularjs
	$scope.isActive = function(path) {
		var cur_path = $location.path().replace('/', '');
		var result = false;

		if (path instanceof Array) {
			angular.forEach(path, function(p) {
				if (p == cur_path && !result)
					result = true;
			});
		}
		else {
			if (cur_path == path)
				result = true;
		}
		return result;
	};

		$scope.isActivePartialPath = function(path) {
		var cur_path = $location.path().replace('/', '');
		var result = false;

		if (path instanceof Array) {
				angular.forEach(path, function(p) {
						if ((cur_path.search(p) >= 0) && !result)
								result = true;
				});
		}
		else {
				if (cur_path.search(path) >= 0)
						result = true;
		}
		return result;
};

	// extension of above isActive in path
	$scope.isInPath = function(path) {
		var cur_path = $location.path().replace('/', '');
		var result = false;

		if(cur_path.indexOf(path) > -1) {
			result = true;
		}
		else {
			result = false;
		}
		return result;
	};

	//Punchout
	$scope.PunchoutSession = Punchout.punchoutSession;

	// Gift redemption notice (replaces the old browser confirm() pop-ups).
	// image: optional banner, 960x340 (2.8:1), e.g. "images/gift-newhire.jpg" (relative to the app folder).
	//        Leave blank to show the Nest logo on a light blue background instead.
	// category: the gift catalog category; up to three products with photos are shown in the modal.
	var GIFT_NOTICES = {
		"New Hire": {
			label: "Free new hire gift",
			title: "Welcome to The Nest!",
			message: "We're so glad you're here. To welcome you, pick out one item from our new hire gift collection, completely free.",
			gift: "new hire gift",
			image: "",
			category: "nest_nhk",
			path: "/catalog/nest_nhk"
		},
		"Anniversary": {
			label: "Free anniversary gift",
			title: "Happy Work Anniversary!",
			message: "Thank you for another great year with us. To celebrate, pick out one item from our anniversary gift collection, completely free.",
			gift: "anniversary gift",
			image: "",
			category: "nest_ag",
			path: "/catalog/nest_ag"
		}
	};

	var GIFT_MODAL_STYLE = [
		'<style>',
		'.gift-notice-modal .modal-dialog {width:600px; max-width:calc(100% - 32px); margin:60px auto;}',
		'.gift-notice-modal.gift-confirm .modal-dialog {width:500px; margin-top:120px;}',
		'.gift-notice-modal .modal-content {position:relative; width:100% !important; padding:0; border-radius:8px; box-shadow:0 8px 32px rgba(0,0,0,.22); overflow:hidden; text-align:center;}',
		'.gift-notice-modal .gift-hero {position:relative; padding-top:35.42%; background:#e3f1f8 url(images/favicon.png) no-repeat center center; background-size:auto 66%; overflow:hidden;}',
		'.gift-notice-modal .gift-hero-img {position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover;}',
		'.gift-notice-modal a.gift-close {position:absolute; top:12px; right:12px; z-index:2; width:32px; height:32px; line-height:32px; border-radius:4px; background:#fff; color:#242629; font-size:16px; text-align:center; cursor:pointer; text-decoration:none; opacity:.9;}',
		'.gift-notice-modal a.gift-close:hover {opacity:1;}',
		'.gift-notice-modal .gift-body {padding:30px 48px 0; font-family:"Open Sans", Arial, sans-serif;}',
		'.gift-notice-modal .gift-label {margin:0 0 8px; color:#007FA3; font-size:13px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase;}',
		'.gift-notice-modal h2 {margin:0 0 12px; font-size:30px; font-weight:700; color:#242629;}',
		'.gift-notice-modal.gift-confirm h2 {font-size:24px;}',
		'.gift-notice-modal .gift-message {margin:0; font-size:16px; line-height:1.6; color:#55595e;}',
		'.gift-notice-modal .gift-option-list {display:flex; gap:16px; padding:26px 48px 0; font-family:"Open Sans", Arial, sans-serif;}',
		'.gift-notice-modal .gift-option {flex:1; min-width:0;}',
		'.gift-notice-modal .gift-option-img {height:140px; border:1px solid #e5e5e5; border-radius:6px; display:flex; align-items:center; justify-content:center; padding:10px; background:#fff;}',
		'.gift-notice-modal .gift-option-img img {max-width:100%; max-height:100%; object-fit:contain;}',
		'.gift-notice-modal .gift-option-name {margin-top:8px; font-size:13px; line-height:1.35; color:#3B3E41; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}',
		'.gift-notice-modal .gift-option-free {font-size:12px; font-weight:700; color:#007FA3; text-transform:uppercase; letter-spacing:1px;}',
		'.gift-notice-modal .gift-notice-actions {display:flex; justify-content:center; gap:12px; padding:30px 48px 36px;}',
		'.gift-notice-modal .gift-notice-actions .btn {min-width:170px; padding:13px 22px; font-size:14px;}',
		'.gift-notice-modal.gift-confirm .gift-notice-actions {padding:28px 36px 32px;}',
		'.gift-notice-modal.gift-confirm .gift-notice-actions .btn {flex:1; min-width:0; padding:13px 14px; font-size:13px;}',
		'.gift-notice-modal .gift-notice-actions .btn {font-family:"Open Sans", Arial, sans-serif; font-weight:700; letter-spacing:1.35px; text-transform:uppercase; border-radius:6px; border:2px solid #007FA3; transition:background-color .2s ease, border-color .2s ease, color .2s ease, box-shadow .2s ease;}',
		'.gift-notice-modal .btn-redeem {background:#007FA3; color:#fff; box-shadow:0 2px 6px rgba(0,127,163,.25);}',
		'.gift-notice-modal .btn-redeem:hover {background:#006a88; border-color:#006a88; color:#fff;}',
		'.gift-notice-modal .btn-later {background:#fff; color:#007FA3;}',
		'.gift-notice-modal .btn-later:hover {background:#e8f4f8; color:#006a88;}',
		'.gift-notice-modal .gift-notice-actions .btn:focus {outline:none; color:inherit;}',
		'.gift-notice-modal .btn-redeem:focus {color:#fff;}',
		'.gift-notice-modal .btn-later:focus {color:#007FA3;}',
		'.gift-notice-modal .gift-notice-actions .btn:focus-visible {box-shadow:0 0 0 3px rgba(0,127,163,.35);}',
		'@media (max-width:767px) {',
		'.gift-notice-modal .modal-dialog, .gift-notice-modal.gift-confirm .modal-dialog {margin:20px auto;}',
		'.gift-notice-modal .gift-body {padding:24px 20px 0;}',
		'.gift-notice-modal h2 {font-size:24px;}',
		'.gift-notice-modal .gift-message {font-size:15px;}',
		'.gift-notice-modal .gift-option-list {gap:8px; padding:20px 20px 0;}',
		'.gift-notice-modal .gift-option-img {height:90px; padding:6px;}',
		'.gift-notice-modal .gift-option-name {font-size:12px;}',
		'.gift-notice-modal .gift-notice-actions {flex-direction:column-reverse; gap:10px; padding:24px 20px;}',
		'.gift-notice-modal .gift-notice-actions .btn {width:100%; min-width:0;}',
		'}',
		'</style>'
	].join('');

	var GIFT_MODAL_TEMPLATE = GIFT_MODAL_STYLE + [
		'<div class="gift-hero">',
			'<img class="gift-hero-img" ng-if="notice.image" ng-src="{{notice.image}}" alt="" />',
			'<a class="gift-close" ng-click="later()" aria-label="Close"><i class="fa fa-times"></i></a>',
		'</div>',
		'<div class="gift-body">',
			'<p class="gift-label">{{notice.label}}</p>',
			'<h2>{{notice.title}}</h2>',
			'<p class="gift-message">{{notice.message}}</p>',
		'</div>',
		'<div class="gift-option-list" ng-if="products.length">',
			'<div class="gift-option" ng-repeat="p in products">',
				'<div class="gift-option-img"><img ng-src="{{p.image}}" alt="{{p.name}}" /></div>',
				'<div class="gift-option-name" title="{{p.name}}">{{p.name}}</div>',
				'<div class="gift-option-free">Free</div>',
			'</div>',
		'</div>',
		'<div class="gift-notice-actions">',
			'<button type="button" class="btn btn-later" ng-click="later()">Maybe Later</button>',
			'<button type="button" class="btn btn-redeem" ng-click="redeem()">Redeem</button>',
		'</div>'
	].join('');

	var GIFT_CONFIRM_TEMPLATE = GIFT_MODAL_STYLE + [
		'<a class="gift-close" ng-click="later()" aria-label="Close"><i class="fa fa-times"></i></a>',
		'<div class="gift-body">',
			'<h2>Are you sure?</h2>',
			'<p class="gift-message">This reminder will keep popping up until you redeem your free {{notice.gift}}.</p>',
		'</div>',
		'<div class="gift-notice-actions">',
			'<button type="button" class="btn btn-later" ng-click="later()">Remind Me Later</button>',
			'<button type="button" class="btn btn-redeem" ng-click="redeem()">Redeem</button>',
		'</div>'
	].join('');

	// First few products with photos from the gift category. Calls the API directly
	// (not Product.search) so it can't clear the product list cached by a category page.
	function loadGiftProducts(category) {
		return $resource($451.api('Products')).get({ CategoryInteropID: category, SearchTerms: '', Page: 1, PageSize: 12 }).$promise.then(
			function (data) {
				var list = [];
				angular.forEach((data && data.List) || [], function (p) {
					var image = p.SmallImageUrl || p.LargeImageUrl;
					if (image && list.length < 3) {
						list.push({ name: p.Name, image: image });
					}
				});
				return list;
			},
			function () {
				return [];
			}
		);
	}

	// Opens a gift modal. Redeem goes to the gift category; any other way of
	// closing it (button, X, Esc, backdrop) runs onLater.
	function showGiftModal(notice, template, windowClass, loadProducts, onLater) {
		$modal.open({
			backdrop: true,
			keyboard: true,
			windowClass: windowClass,
			template: template,
			controller: ['$scope', '$modalInstance', 'notice', function ($scope, $modalInstance, notice) {
				$scope.notice = notice;
				// Open right away; product photos fill in when they load (never blocks the modal).
				$scope.products = [];
				if (loadProducts) {
					loadGiftProducts(notice.category).then(function (list) {
						$scope.products = list;
					});
				}
				$scope.redeem = function () {
					$modalInstance.close(true);
				};
				$scope.later = function () {
					$modalInstance.dismiss('later');
				};
			}],
			resolve: {
				notice: function () {
					return notice;
				}
			}
		}).result.then(function () {
			$location.path(notice.path);
		}, function () {
			if (onLater) {
				onLater();
			}
		});
	}

	function openGiftModal(notice) {
		showGiftModal(notice, GIFT_MODAL_TEMPLATE, 'gift-notice-modal', true, function () {
			showGiftModal(notice, GIFT_CONFIRM_TEMPLATE, 'gift-notice-modal gift-confirm', false);
		});
	}

	// The gift notice shows once per visit (browser session) until the gift is ordered;
	// after checkout, User.giftItemType returns false and it stops.
	function giftNoticeShown() {
		try { return !!sessionStorage.getItem("giftItemNotice"); } catch (e) { return false; }
	}
	function setGiftNoticeShown() {
		try { sessionStorage.setItem("giftItemNotice", 1); } catch (e) {}
	}

	// Load the user fresh from 451 once per page load, so hire date changes made
	// in admin are picked up on reload instead of waiting for a logout/login.
	var userRefreshed = false;

	function init() {
		if (Security.isAuthenticated()) {
			var loadUser = userRefreshed ? User.get : User.refresh;
			userRefreshed = true;
			loadUser(function (user) {
				var hireDate = false, hireDateHistory = false, update = false;
				if(user.Phone && /^\d{4}-\d{2}\-\d{2}/.test(user.Phone)){
					hireDate = new Date(user.Phone.slice(0,10));
					user.Phone = "";
					!!+hireDate && user.CustomFields && jQuery.each(user.CustomFields,function(i,el){
						if(el.Name == "Nest_Newhire_Date"){
							try{
								hireDateHistory = JSON.parse(el.Value);
							} catch(e){}
							if(!hireDateHistory || hireDateHistory.constructor != Object){
								hireDateHistory = {};
							}
							if("date" in hireDateHistory){
								hireDateHistory.date = new Date(hireDateHistory.date);
							}
							else{
								hireDateHistory.date = 0;
							}
							if(+hireDateHistory.date != +hireDate){
								hireDateHistory.date = hireDate.getUTCFullYear() + "-" + (hireDate.getUTCMonth() + 1 + "").padStart(2,"0") + "-" + (hireDate.getUTCDate() + "").padStart(2,"0");
								el.Value = JSON.stringify(hireDateHistory);
								update = true;
							}
							return false;
						}
					});
				}
				if(update){
					User.save(user,function(u){
						doInit(u,hireDateHistory);
					});
				}
				else{
					doInit(user,hireDateHistory);
				}

				function doInit(user){
					$scope.user = user;
					// Load which products are gift items (used to hide their prices).
					GiftItems.load();
					$scope.adminMember = false;
					$scope.testUser = false;
					angular.forEach($scope.user.Groups, function(group){
						if(group.Name == "Dashboard"){
							$scope.dashUser = true;
						} else if (group.Name == "Administration") {
							$scope.adminUser = true;
						} else if (group.Name == "HR") {
							$scope.hrUser = true;
						} else if (group.Name == "Sales and Marketing") {
							$scope.salesUser = true;
						} else if (group.Name == "Insights") {
							$scope.insightsUser = true;
						} else if (group.Name == "Test") {
							$scope.testUser = true;
						}
					});

					$scope.user.Culture.CurrencyPrefix = XLATService.getCurrentLanguage(user.CultureUI, user.Culture.Name)[1];
					$scope.user.Culture.DateFormat = XLATService.getCurrentLanguage(user.CultureUI, user.Culture.Name)[2];

			//         var setLocation = store.get('locationSet');
			// 		if (!setLocation) {
			// 		  store.set('locationSet', true)
			// 		  $location.path('catalog/adt_shop');
			// 		}

					//Punchout
					var punchoutConfigured = store.get('punchoutconfig');
					if(!punchoutConfigured){
						angular.forEach($scope.user.Permissions,function(permission){
							if(permission == "PunchoutUser"){
								$scope.PunchoutUser = true;

								if($scope.PunchoutSession && $scope.PunchoutSession.PunchOutOperation == 'Edit') $location.path('cart');
								else if($scope.PunchoutSession && $scope.PunchoutSession.PunchoutLandingCategory) $location.path('catalog/' + $scope.PunchoutSession.PunchoutLandingCategory);
								else if($scope.PunchoutSession && $scope.PunchoutSession.PunchoutLandingProduct) $location.path('product/' + $scope.PunchoutSession.PunchoutLandingProduct);
								store.set('punchoutconfig','true');
							}
						});
					}

					//SPENDING ACCOUNTS NAV
					SpendingAccount.query(function(data) {
						$scope.userSpendingAccounts = data;
					});

					if (!$scope.user.TermsAccepted)
						$location.path('conditions');

					if (user.CurrentOrderID) {
						Order.get(user.CurrentOrderID, function (ordr) {
							$scope.currentOrder = ordr;
							OrderConfig.costcenter(ordr, user);
						});
					}
					else
						$scope.currentOrder = null;

					if (user.Company.GoogleAnalyticsCode) {
						GoogleAnalytics.analyticsLogin(user.Company.GoogleAnalyticsCode);
					}
					Category.tree(function (data) {
						$scope.tree = data;
						$scope.$broadcast("treeComplete", data);
					});
					$timeout(function(){
						var type = User.giftItemType($scope.user);
						var notice = GIFT_NOTICES[type];
						// TEMPORARY: gift pop-ups only show for users in the "Test" group.
						// Remove "$scope.testUser &&" below to turn them on for everyone.
						// Skip while they're already browsing the gift category.
						if(notice && $scope.testUser && !giftNoticeShown() && $location.path().indexOf(notice.path) !== 0){
							setGiftNoticeShown();
							openGiftModal(notice);
						}
					},1000);
				}
			});
		}
	}

	try {
		trackJs.configure({
			trackAjaxFail: false
		});
	}
	catch(ex) {}

	$scope.errorSection = '';

	function cleanup() {
		Security.clear();
	}

	$scope.$on('event:auth-loginConfirmed', function(){
		$route.reload();
	});
	$scope.$on("$routeChangeSuccess", init);
	$scope.$on('event:auth-loginRequired', cleanup);
}]);
