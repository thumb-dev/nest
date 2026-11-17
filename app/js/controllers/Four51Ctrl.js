four51.app.controller('Four51Ctrl', ['$scope', '$route', '$timeout', '$location', '$modal', '$resource', 'Punchout', '$451', 'User', 'Order', 'Security', 'OrderConfig', 'Category', 'AppConst','XLATService', 'GoogleAnalytics', 'SpendingAccount',
function ($scope, $route, $timeout, $location, $modal, $resource, Punchout, $451, User, Order, Security, OrderConfig, Category, AppConst, XLATService, GoogleAnalytics, SpendingAccount) {
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
	// image: optional 960x340 banner, e.g. "images/gift-newhire.jpg" (relative to the app folder).
	//        Leave blank and the modal opens without a banner.
	// category: the gift catalog category; up to three products with photos are shown in the modal.
	var GIFT_NOTICES = {
		"New Hire": {
			label: "New hire gift",
			title: "Welcome to The Nest",
			message: "As a thank-you for joining us, you can choose one item from our new hire gift collection.",
			image: "",
			category: "GiftItemsNewHire",
			path: "/catalog/GiftItemsNewHire"
		},
		"Anniversary": {
			label: "Anniversary gift",
			title: "Happy work anniversary",
			message: "Thank you for another year with The Nest. You can choose one item from our anniversary gift collection.",
			image: "",
			category: "GiftItemsAnniversary",
			path: "/catalog/GiftItemsAnniversary"
		}
	};

	var GIFT_MODAL_TEMPLATE = [
		'<style>',
		'.gift-notice-modal .modal-dialog {width:480px; max-width:calc(100% - 32px); margin:80px auto;}',
		'.gift-notice-modal .modal-content {position:relative; width:100% !important; padding:0; border-radius:4px; box-shadow:0 4px 24px rgba(0,0,0,.18); overflow:hidden; font-family:"Open Sans", Arial, sans-serif;}',
		'.gift-notice-modal .gift-banner {display:block; width:100%; height:170px; object-fit:cover;}',
		'.gift-notice-modal a.gift-close {position:absolute; top:14px; right:16px; z-index:2; color:#242629; font-size:18px; line-height:1; opacity:.55; cursor:pointer; text-decoration:none;}',
		'.gift-notice-modal a.gift-close:hover {opacity:1;}',
		'.gift-notice-modal.has-banner a.gift-close {top:10px; right:10px; padding:6px 7px; border-radius:4px; background:#fff; opacity:.9;}',
		'.gift-notice-modal .gift-body {padding:28px 32px 0;}',
		'.gift-notice-modal .gift-label {margin:0 0 6px; color:#007FA3; font-size:12px; font-weight:700; letter-spacing:1px; text-transform:uppercase;}',
		'.gift-notice-modal h3 {margin:0 0 10px; font-size:22px; font-weight:700; color:#242629;}',
		'.gift-notice-modal .gift-message {margin:0; font-size:14px; line-height:1.6; color:#55595e;}',
		'.gift-notice-modal .gift-option-list {display:flex; gap:12px; padding:22px 32px 0;}',
		'.gift-notice-modal .gift-option {flex:1; min-width:0;}',
		'.gift-notice-modal .gift-option-img {height:104px; border:1px solid #e5e5e5; border-radius:4px; display:flex; align-items:center; justify-content:center; padding:8px; background:#fff;}',
		'.gift-notice-modal .gift-option-img img {max-width:100%; max-height:100%; object-fit:contain;}',
		'.gift-notice-modal .gift-option-name {margin-top:6px; font-size:12px; line-height:1.35; color:#55595e; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}',
		'.gift-notice-modal .gift-notice-actions {display:flex; justify-content:flex-end; gap:10px; margin-top:24px; padding:16px 32px; border-top:1px solid #eee;}',
		'.gift-notice-modal .gift-notice-actions .btn {padding:10px 18px; font-size:12px;}',
		'.gift-notice-modal .btn-redeem {background:#242629; border:1px solid #242629; color:#fff; font-weight:bold; letter-spacing:1.35px; text-transform:uppercase; border-radius:4px;}',
		'.gift-notice-modal .btn-redeem:hover, .gift-notice-modal .btn-redeem:focus {background:#007FA3; border-color:#007FA3; color:#fff;}',
		'@media (max-width:767px) {',
		'.gift-notice-modal .modal-dialog {margin:24px auto;}',
		'.gift-notice-modal .gift-banner {height:130px;}',
		'.gift-notice-modal .gift-body {padding:24px 20px 0;}',
		'.gift-notice-modal h3 {font-size:20px;}',
		'.gift-notice-modal .gift-option-list {gap:8px; padding:18px 20px 0;}',
		'.gift-notice-modal .gift-option-img {height:80px; padding:6px;}',
		'.gift-notice-modal .gift-notice-actions {flex-direction:column-reverse; padding:14px 20px 18px;}',
		'.gift-notice-modal .gift-notice-actions .btn {width:100%;}',
		'}',
		'</style>',
		'<a class="gift-close" ng-click="close()" aria-label="Close"><i class="fa fa-times"></i></a>',
		'<img class="gift-banner" ng-if="notice.image" ng-src="{{notice.image}}" alt="" />',
		'<div class="gift-body">',
			'<p class="gift-label">{{notice.label}}</p>',
			'<h3>{{notice.title}}</h3>',
			'<p class="gift-message">{{notice.message}}</p>',
		'</div>',
		'<div class="gift-option-list" ng-if="products.length">',
			'<div class="gift-option" ng-repeat="p in products">',
				'<div class="gift-option-img"><img ng-src="{{p.image}}" alt="{{p.name}}" /></div>',
				'<div class="gift-option-name" title="{{p.name}}">{{p.name}}</div>',
			'</div>',
		'</div>',
		'<div class="gift-notice-actions">',
			'<button type="button" class="btn btn-info" ng-click="later()">Not now</button>',
			'<button type="button" class="btn btn-redeem" ng-click="redeem()">View gifts</button>',
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

	function openGiftModal(notice) {
		var modalInstance = $modal.open({
			backdrop: true,
			keyboard: true,
			windowClass: 'gift-notice-modal' + (notice.image ? ' has-banner' : ''),
			template: GIFT_MODAL_TEMPLATE,
			controller: ['$scope', '$modalInstance', 'notice', function ($scope, $modalInstance, notice) {
				$scope.notice = notice;
				// Open right away; product photos fill in when they load (never blocks the modal).
				$scope.products = [];
				loadGiftProducts(notice.category).then(function (list) {
					$scope.products = list;
				});
				$scope.redeem = function () {
					$modalInstance.close(true);
				};
				$scope.later = $scope.close = function () {
					$modalInstance.dismiss('later');
				};
			}],
			resolve: {
				notice: function () {
					return notice;
				}
			}
		});

		modalInstance.result.then(function (redeem) {
			if (redeem) {
				$location.path(notice.path);
			}
		});
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
					$scope.adminMember = false;
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
						if(notice && !localStorage.getItem("giftItemNotice")){
							localStorage.setItem("giftItemNotice",1);
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
