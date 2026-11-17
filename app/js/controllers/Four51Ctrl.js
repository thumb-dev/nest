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
	// image: optional banner photo, e.g. "images/gift-newhire.jpg" (relative to the app folder).
	//        Leave blank to show the Nest-colored banner instead.
	// category: the gift catalog category; the first few products with photos are shown in the modal.
	var GIFT_NOTICES = {
		"New Hire": {
			label: "New Hire Gift",
			title: "Welcome to The Nest!",
			message: "We're so glad you're here. Your new hire gift is ready, so pick something you'll love.",
			image: "",
			category: "GiftItemsNewHire",
			path: "/catalog/GiftItemsNewHire"
		},
		"Anniversary": {
			label: "Anniversary Gift",
			title: "Happy Work Anniversary!",
			message: "Thank you for another great year with us. Your anniversary gift is ready to pick out.",
			image: "",
			category: "GiftItemsAnniversary",
			path: "/catalog/GiftItemsAnniversary"
		}
	};

	var GIFT_MODAL_TEMPLATE = [
		'<style>',
		'.gift-notice-modal .modal-dialog {width:480px; max-width:calc(100% - 32px); margin:70px auto;}',
		'.gift-notice-modal .modal-content {width:100% !important; padding:0; border-radius:12px; box-shadow:0 18px 50px rgba(17,23,43,.28); overflow:hidden; font-family:"Open Sans", Arial, sans-serif;}',
		'.gift-notice-modal .gift-hero {position:relative; height:170px; overflow:hidden; background:linear-gradient(135deg, #dcedf6 0%, #e9f2df 100%);}',
		'.gift-notice-modal .gift-hero:before, .gift-notice-modal .gift-hero:after {content:""; position:absolute; border-radius:50%;}',
		'.gift-notice-modal .gift-hero:before {width:220px; height:220px; right:-60px; top:-90px; background:rgba(0,127,163,.16);}',
		'.gift-notice-modal .gift-hero:after {width:150px; height:150px; left:-40px; bottom:-70px; background:rgba(111,163,0,.16);}',
		'.gift-notice-modal .gift-hero .gift-eggs {position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); display:flex; gap:10px; z-index:1;}',
		'.gift-notice-modal .gift-hero .gift-eggs span {display:block; width:34px; height:44px; border-radius:50% 50% 50% 50% / 60% 60% 40% 40%; box-shadow:0 6px 14px rgba(17,23,43,.12);}',
		'.gift-notice-modal .gift-hero .gift-eggs span:nth-child(1) {background:#8cc4e6; transform:rotate(-12deg);}',
		'.gift-notice-modal .gift-hero .gift-eggs span:nth-child(2) {background:#f2a7b8; transform:translateY(-8px);}',
		'.gift-notice-modal .gift-hero .gift-eggs span:nth-child(3) {background:#a9cf7e; transform:rotate(12deg);}',
		'.gift-notice-modal .gift-hero img {position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; z-index:2;}',
		'.gift-notice-modal a.gift-close {position:absolute; top:12px; right:12px; z-index:3; width:32px; height:32px; border-radius:50%; background:rgba(255,255,255,.9); color:#242629; display:flex; align-items:center; justify-content:center; font-size:15px; cursor:pointer; box-shadow:0 2px 6px rgba(0,0,0,.15); text-decoration:none;}',
		'.gift-notice-modal a.gift-close:hover {background:#fff;}',
		'.gift-notice-modal .gift-body {padding:26px 32px 4px; text-align:center;}',
		'.gift-notice-modal .gift-label {display:inline-block; margin-bottom:10px; padding:4px 12px; border-radius:20px; background:rgba(0,127,163,.1); color:#007FA3; font-size:11px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase;}',
		'.gift-notice-modal h3 {margin:0 0 8px; font-size:24px; font-weight:700; color:#242629;}',
		'.gift-notice-modal .gift-message {margin:0; font-size:15px; line-height:1.55; color:#55595e;}',
		'.gift-notice-modal .gift-options {padding:22px 32px 0;}',
		'.gift-notice-modal .gift-options-title {display:flex; align-items:center; gap:10px; margin-bottom:12px; color:#7F7063; font-size:11px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase;}',
		'.gift-notice-modal .gift-options-title:before, .gift-notice-modal .gift-options-title:after {content:""; flex:1; height:1px; background:#e6e2de;}',
		'.gift-notice-modal .gift-option-list {display:flex; gap:12px;}',
		'.gift-notice-modal .gift-option {flex:1; min-width:0; text-align:center;}',
		'.gift-notice-modal .gift-option-img {height:110px; border-radius:8px; background:#f5f4f2; display:flex; align-items:center; justify-content:center; padding:8px;}',
		'.gift-notice-modal .gift-option-img img {max-width:100%; max-height:100%; object-fit:contain;}',
		'.gift-notice-modal .gift-option-name {margin-top:6px; font-size:12px; line-height:1.35; color:#3B3E41; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;}',
		'.gift-notice-modal .gift-notice-actions {display:flex; gap:12px; padding:24px 32px 28px;}',
		'.gift-notice-modal .gift-notice-actions .btn {flex:1; padding:12px 16px; border-width:1px; font-size:13px;}',
		'.gift-notice-modal .btn-redeem {background:#242629; border-color:#242629; color:#fff; font-weight:bold; letter-spacing:1.35px; text-transform:uppercase; border-radius:4px;}',
		'.gift-notice-modal .btn-redeem:hover, .gift-notice-modal .btn-redeem:focus {background:#007FA3; border-color:#007FA3; color:#fff;}',
		'@media (max-width:767px) {',
		'.gift-notice-modal .modal-dialog {margin:24px auto;}',
		'.gift-notice-modal .gift-hero {height:130px;}',
		'.gift-notice-modal .gift-body {padding:22px 20px 0;}',
		'.gift-notice-modal h3 {font-size:21px;}',
		'.gift-notice-modal .gift-options {padding:18px 20px 0;}',
		'.gift-notice-modal .gift-option-list {gap:8px;}',
		'.gift-notice-modal .gift-option-img {height:84px; padding:6px;}',
		'.gift-notice-modal .gift-notice-actions {flex-direction:column-reverse; padding:20px 20px 22px;}',
		'}',
		'</style>',
		'<div class="gift-hero">',
			'<div class="gift-eggs"><span></span><span></span><span></span></div>',
			'<img ng-if="notice.image" ng-src="{{notice.image}}" alt="" />',
			'<a class="gift-close" ng-click="close()" aria-label="Close"><i class="fa fa-times"></i></a>',
		'</div>',
		'<div class="gift-body">',
			'<span class="gift-label">{{notice.label}}</span>',
			'<h3>{{notice.title}}</h3>',
			'<p class="gift-message">{{notice.message}}</p>',
		'</div>',
		'<div class="gift-options" ng-if="products.length">',
			'<div class="gift-options-title">A few of your options</div>',
			'<div class="gift-option-list">',
				'<div class="gift-option" ng-repeat="p in products">',
					'<div class="gift-option-img"><img ng-src="{{p.image}}" alt="{{p.name}}" /></div>',
					'<div class="gift-option-name">{{p.name}}</div>',
				'</div>',
			'</div>',
		'</div>',
		'<div class="gift-notice-actions">',
			'<button type="button" class="btn btn-info" ng-click="later()">Maybe Later</button>',
			'<button type="button" class="btn btn-redeem" ng-click="redeem()">Browse My Gifts</button>',
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
			windowClass: 'gift-notice-modal',
			template: GIFT_MODAL_TEMPLATE,
			controller: ['$scope', '$modalInstance', 'notice', 'products', function ($scope, $modalInstance, notice, products) {
				$scope.notice = notice;
				$scope.products = products;
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
				},
				products: function () {
					return loadGiftProducts(notice.category);
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
