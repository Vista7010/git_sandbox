var win = Ti.UI.createWindow({
	title:'現在地取得',
	backgroundColor:'#ccc'
});

var view_find =Ti.UI.createView();

var cLocLat;
var cLocLong;

var earth_r = 6378.137;

/* JSONデータをパース */
var file = Ti.Filesystem.getFile(Titanium.Filesystem.resourcesDirectory, 'testdb.json');
var json = file.read().toString();
if (json && json.length > 0) {
	Ti.App.spots = JSON.parse(json);
}

/* マップ */
var mapview = Ti.Map.createView({
	mapType: Ti.Map.STANDARD_TYPE,
	// 地図の中心と表示する幅を指定する
	region:{latitude:40.0, longitude:130, latitudeDelta:30, longitudeDelta:30},
	animate:true,
	regionFit:true,
});

if(Ti.Platform.osname == "iphone"){
	mapview = Ti.Map.createView({
		width:320,
		height:240,
		top:0,
		userLocation:true
	});
}else if(Ti.Platform.osname == "android"){
	mapview = Ti.Map.createView({
		width:480,
		height:400,
		top:0,
		userLocation:true
	});
}
view_find.add(mapview);

/* ラベル2種類 */
if(Ti.Platform.osname == "iphone"){
	var labelPos = Ti.UI.createLabel({
		text: 'hogehoge',
		height: 70,
		top: 250
	});
}else if(Ti.Platform.osname == "android"){
	var labelPos = Ti.UI.createLabel({
		text: 'hogehoge',
		height: 70,
		top: 450,
		color: "#000000"
	});
}
view_find.add(labelPos);

/* コンパス */
if(Ti.Platform.osname == "iphone"){
	var compass = Ti.UI.createImageView({
		image:'images/yazirushi.png',
		width: 80,
		height:80,
		top: 320,
	});
}else if(Ti.Platform.osname == "android"){
	var compass = Ti.UI.createImageView({
		image:'images/yazirushi.png',
		width: 80,
		height:80,
		top: 320,
	});
}

/* mHeadの中身と残りの距離を見るラベル */
if(Ti.Platform.osname == "iphone"){
	var labelHead = Ti.UI.createLabel({
		text: 'hogehogeHead',
		height: 35,
		top: 250
	});
}else if(Ti.Platform.osname == "android"){
	var labelHead = Ti.UI.createLabel({
		text: 'hogehogeHead',
		height: 35,
		top: 500,
		color: "#000000"
	});
}
view_find.add(labelHead);
if(Ti.Platform.osname == "iphone"){
	var labelDist = Ti.UI.createLabel({
		text: 'hogehogeDist',
		height: 35,
		top: 290
	});
}else if(Ti.Platform.osname == "android"){
	var labelDist = Ti.UI.createLabel({
		text: 'hogehogeDist',
		height: 35,
		top: 540,
		color: "#000000"
	});
}
view_find.add(labelDist);

Ti.Geolocation.purpose = '現在地を取得し近くのスポットを検索するため'; // GPSの利用目的を明記

/* addEventListenerでは情報は一度きりしかとらない */
Ti.Geolocation.getCurrentPosition(
	function(e) {
		if (!e.success || e.error){
			alert('位置情報が取得できませんでした');
			return;
		}
	
		cLocLat = e.coords.latitude;
		cLocLong = e.coords.longitude;
		mapview.show(); // 地図を表示する
		mapview.region = {   // 現在地まで地図をスクロールする
			latitude:cLocLat,
			longitude:cLocLong,
			latitudeDelta:0.01,
			longitudeDelta:0.01
		}
	}
);

/* 位置情報を取り続ける */
if(Ti.Platform.osname == 'android'){
	var providerGps = Ti.Geolocation.Android.createLocationProvider({
		name: Ti.Geolocation.PROVIDER_GPS,
		minUpdateDistance: 5.0, //これだけ移動したらとり直すよ
		minUpdateTime: 100 //これだけ経つととり直すよ
	});
	
	Ti.Geolocation.Android.addLocationProvider(providerGps);
	Ti.Geolocation.Android.manualMode = true;
	var locationCallback = function(e) {
		if (!e.success || e.error) {
			labelPos.text = 'error:' + JSON.stringify(e.error);
		}
		cLocLat = e.coords.latitude;
		cLocLong = e.coords.longitude;
		labelPos.text = cLocLat+'\n'+cLocLong ;
		mapview.region = {   // 現在地まで地図をスクロールする
			latitude:cLocLat,
			longitude:cLocLong,
			latitudeDelta:0.01,
			longitudeDelta:0.01
		}
		labelDist.text = calDist(cLocLat,cLocLong,Ti.App.spots.spotdata[4].latitude,Ti.App.spots.spotdata[4].longitude)
	};
	Titanium.Geolocation.addEventListener('location', locationCallback);
}else if(Ti.Platform.osname == 'iphone' ){
	/* addEventListenerでは繰り返して情報を取り出す */
	Ti.Geolocation.addEventListener("location", function(e) {
		if (!e.success || e.error){
			alert('位置情報が取得できませんでした');
			return;
		}
		cLocLat = e.coords.latitude;
		cLocLong = e.coords.longitude;
		Ti.API.info(cLocLat);
		Ti.API.info(cLocLong);
		labelPos.text = cLocLat+'\n'+ cLocLong ;
		mapview.region = {   // 現在地まで地図をスクロールする
			latitude:cLocLat,
			longitude:cLocLong,
			latitudeDelta:0.01,
			longitudeDelta:0.01
		}
	});
}

var updateCompass = function(e){
	if(e.error){
		Ti.API.info(e);
		return;
	}
	var mHead = e.heading.magneticHeading;
	labelHead.text = mHead;
	var rotate = Ti.UI.create2DMatrix();
	var angle = 360 + mHead - calDir(cLocLat,cLocLong,Ti.App.spots.spotdata[4].latitude,Ti.App.spots.spotdata[4].longitude);
	rotate = rotate.rotate(angle);
	compass.transform = rotate;
	labelHead.text = mHead+'p'+angle+'p'+rotate;
};

Ti.Geolocation.headingFilter = 90;
Ti.Geolocation.getCurrentHeading(function(e){
	updateCompass(e);
});

Ti.Geolocation.addEventListener('heading',function(e){
	updateCompass(e);
})

view_find.add(compass);

win.add(view_find);
win.open();


/* 2点間から向きを出す */
function calDir(aLat,aLong,bLat,bLong){
	aLat = deg2rad(aLat);
	aLong = deg2rad(aLong);
	bLat = deg2rad(bLat);
	bLong = deg2rad(bLong);
	
	var latCenter = (aLat + bLat) / 2 ;
	var dx = earth_r * (bLong - aLong)* Math.cos(latCenter);
	var dy = earth_r *(bLat - aLat);
	
	if (dx == 0 && dy == 0){return 0;}
	else{ return Math.atan2(dy,dx) / (Math.PI / 180) }
}

/* 2点間の距離を出す */
function calDist(cLat,cLong,bLat,bLong){
	var latSa = deg2rad(bLat - cLat);
	var longSa = deg2rad(bLong - cLong);
	var nanboku = earth_r * latSa;
	var touzai = Math.cos(deg2rad(cLat)) * earth_r * longSa;
	var d = Math.sqrt(Math.pow(touzai,2) + Math.pow(nanboku,2));
	return d ;
}

/* 度をラジアン変換 */
function deg2rad(deg){return deg*Math.PI / 180;}
