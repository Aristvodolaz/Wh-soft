# Mobile Architecture — WMS Platform Android
**Document:** mobile_architecture.md  
**Version:** 1.0  
**Platform:** Android 8.0+ (API 26+)  
**Target Devices:** Смартфоны Android + ТСД (Zebra, Honeywell, Urovo)

---

## 1. Архитектура

### 1.1 Clean Architecture + MVI

```
Presentation Layer (Jetpack Compose + MVI)
    ↑ UI State / Intent
Application Layer (ViewModels + Use Cases)
    ↑ Domain Models
Domain Layer (Use Cases, Repositories interfaces)
    ↑ Data
Data Layer (Repositories impl, API, Room DB)
```

### 1.2 MVI Flow

```
User Action (Intent)
    → ViewModel.processIntent()
    → Use Case.execute()
    → Repository (API / Local DB)
    → Result → UiState update
    → Compose UI recompose
```

```kotlin
// Пример для Tasks Screen
sealed class TasksIntent {
    object LoadTasks : TasksIntent()
    data class CompleteTask(val taskId: String, val items: List<CompletedItem>) : TasksIntent()
    data class ScanBarcode(val code: String) : TasksIntent()
    object Refresh : TasksIntent()
}

data class TasksUiState(
    val tasks: List<Task> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val lastScanResult: ScanResult? = null,
)
```

---

## 2. Структура проекта

```
app/
  src/main/
    java/com/wmsplatform/
      di/
        AppModule.kt
        NetworkModule.kt
        DatabaseModule.kt
        ScannerModule.kt
      data/
        local/
          db/
            AppDatabase.kt        # Room DB
            dao/
              TaskDao.kt
              ProductDao.kt
              PendingOperationDao.kt
          preferences/
            UserPreferences.kt    # DataStore
        remote/
          api/
            WmsApiService.kt      # Retrofit interface
            AuthInterceptor.kt
            NetworkMonitor.kt
          dto/
            TaskDto.kt
            InventoryDto.kt
        repository/
          TaskRepositoryImpl.kt
          InventoryRepositoryImpl.kt
          SyncRepository.kt
      domain/
        model/
          Task.kt
          Product.kt
          Cell.kt
          InventoryItem.kt
          ScanResult.kt
        repository/
          TaskRepository.kt       # Interface
          InventoryRepository.kt
        usecase/
          GetMyTasksUseCase.kt
          CompleteTaskUseCase.kt
          ScanBarcodeUseCase.kt
          MoveInventoryUseCase.kt
          ReceiveGoodsUseCase.kt
      presentation/
        MainActivity.kt
        navigation/
          AppNavGraph.kt
          Screen.kt               # sealed class routes
        screens/
          login/
            LoginScreen.kt
            LoginViewModel.kt
          tasks/
            TasksScreen.kt
            TasksViewModel.kt
            TaskDetailScreen.kt
          scan/
            ScanScreen.kt
            ScanViewModel.kt
          receiving/
            ReceivingScreen.kt
            ReceivingViewModel.kt
          picking/
            PickingScreen.kt
            PickingViewModel.kt
          putaway/
            PutawayScreen.kt
          move/
            MoveScreen.kt
          stocktake/
            StocktakeScreen.kt
          ship/
            ShipScreen.kt
        components/
          ScannerOverlay.kt
          QuantityInput.kt
          TaskCard.kt
          StatusBadge.kt
          ConfirmButton.kt        # xl, full-width
        theme/
          Theme.kt
          Colors.kt
          Typography.kt
          Dimensions.kt
      util/
        scanner/
          BarcodeScanner.kt       # Camera + Hardware
          ScannerType.kt
          DataWedgeReceiver.kt    # Zebra
        sync/
          SyncManager.kt
          SyncWorker.kt           # WorkManager
        extension/
          FlowExtensions.kt
```

---

## 3. Offline Mode

### 3.1 Стратегия

```
Online:  API → Room DB → UI
Offline: Room DB → UI + Queue pending operations
Sync:    WorkManager job при появлении сети
```

### 3.2 Room DB Schema

```kotlin
// Что кэшируется локально:
@Database(
  entities = [
    TaskEntity::class,
    ProductEntity::class,
    CellEntity::class,
    InventorySnapshotEntity::class,
    PendingOperationEntity::class,
  ],
  version = 1
)
abstract class AppDatabase : RoomDatabase() {
  abstract fun taskDao(): TaskDao
  abstract fun productDao(): ProductDao
  abstract fun pendingOperationDao(): PendingOperationDao
}

@Entity(tableName = "pending_operations")
data class PendingOperationEntity(
  @PrimaryKey val id: String = UUID.randomUUID().toString(),
  val type: String,          // MOVE, RECEIVE, COMPLETE_TASK
  val payload: String,       // JSON
  val createdAt: Long = System.currentTimeMillis(),
  val retryCount: Int = 0,
  val synced: Boolean = false,
)
```

### 3.3 Sync Worker

```kotlin
class SyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
  
  override suspend fun doWork(): Result {
    return try {
      val pending = pendingOperationDao.getAllUnsynced()
      var hasError = false

      for (op in pending) {
        try {
          when (op.type) {
            "COMPLETE_TASK" -> {
              val cmd = Json.decodeFromString<CompleteTaskCommand>(op.payload)
              apiService.completeTask(cmd.taskId, cmd.body)
            }
            "MOVE_INVENTORY" -> {
              val cmd = Json.decodeFromString<MoveInventoryBody>(op.payload)
              apiService.moveInventory(cmd)
            }
          }
          pendingOperationDao.markSynced(op.id)
        } catch (e: HttpException) {
          if (e.code() in 400..499) pendingOperationDao.markFailed(op.id)
          else hasError = true
        }
      }
      if (hasError) Result.retry() else Result.success()
    } catch (e: Exception) {
      Result.retry()
    }
  }
}
```

---

## 4. Scanner Integration

### 4.1 Camera Scanner (ML Kit)

```kotlin
class CameraScanner(private val context: Context) {
  
  fun startScanning(
    lifecycleOwner: LifecycleOwner,
    previewView: PreviewView,
    onResult: (String) -> Unit,
  ) {
    val cameraProvider = ProcessCameraProvider.getInstance(context).get()
    val preview = Preview.Builder().build().apply {
      setSurfaceProvider(previewView.surfaceProvider)
    }
    val imageAnalysis = ImageAnalysis.Builder()
      .setBackpressureStrategy(STRATEGY_KEEP_ONLY_LATEST)
      .build()
      .also { analysis ->
        analysis.setAnalyzer(ContextCompat.getMainExecutor(context)) { imageProxy ->
          processImage(imageProxy, onResult)
        }
      }

    val barcodeScanner = BarcodeScanning.getClient(
      BarcodeScannerOptions.Builder()
        .setBarcodeFormats(
          Barcode.FORMAT_QR_CODE,
          Barcode.FORMAT_CODE_128,
          Barcode.FORMAT_EAN_13,
          Barcode.FORMAT_EAN_8,
          Barcode.FORMAT_CODE_39,
          Barcode.FORMAT_DATA_MATRIX,
        ).build()
    )

    cameraProvider.bindToLifecycle(lifecycleOwner, CameraSelector.DEFAULT_BACK_CAMERA, preview, imageAnalysis)
  }

  private fun processImage(imageProxy: ImageProxy, onResult: (String) -> Unit) {
    val mediaImage = imageProxy.image ?: return imageProxy.close()
    val image = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)
    barcodeScanner.process(image)
      .addOnSuccessListener { barcodes ->
        barcodes.firstOrNull()?.rawValue?.let { code ->
          onResult(code)
          // Debounce: не повторять 1 секунду
        }
      }
      .addOnCompleteListener { imageProxy.close() }
  }
}
```

### 4.2 Zebra DataWedge (ТСД)

```kotlin
// DataWedge отправляет результат скана как Intent
class DataWedgeReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action == "com.symbol.datawedge.api.RESULT_ACTION") {
      val data = intent.getStringExtra("com.symbol.datawedge.data_string")
      val source = intent.getStringExtra("com.symbol.datawedge.label_type")
      data?.let { ScanEventBus.emit(ScanResult(code = it, source = source)) }
    }
  }
}

// Регистрация
class MainActivity : ComponentActivity() {
  private val scanReceiver = DataWedgeReceiver()

  override fun onResume() {
    super.onResume()
    registerReceiver(scanReceiver, IntentFilter("com.symbol.datawedge.api.RESULT_ACTION"))
  }

  override fun onPause() {
    super.onPause()
    unregisterReceiver(scanReceiver)
  }
}
```

### 4.3 Honeywell / Urovo

```kotlin
// Honeywell SDK
class HoneywellScanner : ScannerInterface {
  private val scannerService: AidcManager by lazy { AidcManager.create(context) }

  fun enable(onResult: (String) -> Unit) {
    scannerService.createBarcodeReader().also { reader ->
      reader.addBarcodeListener { event ->
        onResult(event.barcodeData)
      }
      reader.softScanTrigger(true)
    }
  }
}
```

---

## 5. Navigation

```kotlin
// navigation/AppNavGraph.kt
@Composable
fun AppNavGraph(navController: NavHostController) {
  NavHost(navController, startDestination = Screen.Login.route) {
    composable(Screen.Login.route) { LoginScreen(navController) }
    composable(Screen.Tasks.route) { TasksScreen(navController) }
    composable(
      Screen.TaskDetail.route,
      arguments = listOf(navArgument("taskId") { type = NavType.StringType })
    ) { backStackEntry ->
      TaskDetailScreen(taskId = backStackEntry.arguments?.getString("taskId")!!, navController)
    }
    composable(Screen.Scan.route) { ScanScreen(navController) }
    composable(Screen.Receiving.route) { ReceivingScreen(navController) }
    composable(Screen.Picking.route) { PickingScreen(navController) }
    composable(Screen.Stocktake.route) { StocktakeScreen(navController) }
    composable(Screen.Ship.route) { ShipScreen(navController) }
  }
}

sealed class Screen(val route: String) {
  object Login : Screen("login")
  object Tasks : Screen("tasks")
  object TaskDetail : Screen("tasks/{taskId}")
  object Scan : Screen("scan")
  object Receiving : Screen("receiving/{orderId}")
  object Picking : Screen("picking/{taskId}")
  object Stocktake : Screen("stocktake/{sessionId}")
  object Ship : Screen("ship/{orderId}")
}
```

---

## 6. Зависимости (Gradle)

```kotlin
// app/build.gradle.kts
dependencies {
  // Core
  implementation("androidx.core:core-ktx:1.12.0")
  implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")
  implementation("androidx.activity:activity-compose:1.8.2")

  // Compose
  implementation(platform("androidx.compose:compose-bom:2024.02.00"))
  implementation("androidx.compose.ui:ui")
  implementation("androidx.compose.material3:material3")
  implementation("androidx.navigation:navigation-compose:2.7.7")

  // DI
  implementation("com.google.dagger:hilt-android:2.50")
  kapt("com.google.dagger:hilt-compiler:2.50")
  implementation("androidx.hilt:hilt-navigation-compose:1.1.0")

  // Network
  implementation("com.squareup.retrofit2:retrofit:2.9.0")
  implementation("com.squareup.retrofit2:converter-gson:2.9.0")
  implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")

  // Local DB
  implementation("androidx.room:room-runtime:2.6.1")
  implementation("androidx.room:room-ktx:2.6.1")
  kapt("androidx.room:room-compiler:2.6.1")

  // DataStore
  implementation("androidx.datastore:datastore-preferences:1.0.0")

  // Camera & Scanning
  implementation("androidx.camera:camera-camera2:1.3.1")
  implementation("androidx.camera:camera-lifecycle:1.3.1")
  implementation("androidx.camera:camera-view:1.3.1")
  implementation("com.google.mlkit:barcode-scanning:17.2.0")

  // Background Sync
  implementation("androidx.work:work-runtime-ktx:2.9.0")
  implementation("androidx.hilt:hilt-work:1.1.0")
}
```

---

*Документ: mobile_architecture.md | WMS Platform Android v1.0*
