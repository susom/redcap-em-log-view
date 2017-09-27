<?php
namespace Stanford\LogViewerModule;


class LogViewerModule extends  \ExternalModules\AbstractExternalModule
{
    // Arrays to hold the paths and names for variously configured log files
	public $paths = array();
	public $names = array();

    public $errors = array();

	public function __construct()
	{
		parent::__construct();
	}

	public function loadSystemPaths()
	{
		$paths = array();

		if ($this->getSystemSetting('include-php-error-log') == "1") {
			// Get the php error log path from the php.ini config
			$paths[] = ini_get('error_log');
		}

		// Loop through all additional files and add them to the loop
		if ($extra_paths = $this->getSystemSetting('path')) {
			// \Plugin::log($extra_paths,"DEBUG");
			foreach ($extra_paths as $path) $paths[] = $path;
		}

		// Validate all paths and names
		foreach ($paths as $i => $path) {
			if (file_exists($path)) {
				$this->paths[$i] = $path;
				$this->names[$i] = $i . "_" . str_replace(
						array(' ','.'),
						array('_','_'),
						strtolower(basename($path))
					);
			} else {
				$this->errors[] = "$path cannot be found!";
			}
		}
	}

	public function handleAjax() {
		if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['seek'])) {
			$seek = $_POST['seek'];
			$name = $_POST['name'];
			// $path = $_POST['path'];

            // \Plugin::log("This is a debug call for $name at $seek","DEBUG");

			$index = array_search($name, $this->names);
			if ($index === false) {
				throw new Exception("Invalid name requested: $name");
			}

			$path = $this->paths[$index];

			$lines = [];
			$handle = fopen($path, 'rb');
			if ($seek > 0) fseek($handle, $seek);
			while (($line = fgets($handle, 4096)) !== false) {
				$lines[] = $line;
			}
			$seek = ftell($handle);

			// Return Data
			header("Content-Type: application/json");
			echo json_encode([
				'name' => $name,
				'seek' => $seek,
				'lines' => $lines]);
			exit();
        }
	}

	public function renderViewers() {
		// Render the viewer
		$html = new \HtmlPage();

		// Include cs file with file-modification-based timestamp (to aid with caching issues during development)
		$cs_file = "css/log_view.css";
		$cs_file_full = $cs_file . "?random=" . filemtime( __DIR__ . DS . $cs_file);

		$html->addStylesheet2( $this->getUrl($cs_file_full), "" );
		$html->PrintHeaderExt();

		// Include js file with file-modification-based timestamp (to aid with caching issues during development)
		$js_file = "js/log_view.js";
		$js_file_full = $js_file . "?random=" . filemtime( __DIR__ . DS . $js_file );
		$js_url = $this->getUrl($js_file_full);
		print "<script type='text/javascript' src='$js_url'></script>";

        // Print any errors
		foreach ($this->errors as $error) {
			print "<div class='alert alert-danger'>ERROR: $error</div>";
		}

		// Render each log file as a table
		if (count($this->paths) == 0) {
		    print "<div class='alert alert-danger'>There are no files configured for logging.  Please view the External Module configuration page.</div>";
		    exit();
		}

		foreach ($this->names as $i => $name) {
		    $path = $this->paths[$i];
		    self::renderDataTable($name, $path);
        }

	}

    // Reposition the control center link to be adjacent to the mysql status
	function hook_control_center()
	{
	    ?>
        <script>
            $(document).ready(function() {
                var thisLink = $('span.log-viewer-module');
                // $('a:contains("External Modules")').parent('span').append(thisLink);

                var emLink = $('a:contains("External Modules")');
                $('<br>').insertAfter(emLink); //<span>&nbsp;</span>");
                thisLink.insertAfter(emLink); // .appendTo(thisLink);
            });
        </script>
        <?php
        \Plugin::log("In the control center");
	}

	public static function renderDataTable($name, $path) {
		print "
            <div class='log-viewer-wrapper' data-name='$name'>
                <div class='title'>$path</div>
                <div class='controls'>
                    <button class='btn btn-xs autoscroll enabled'   data-action='autoscroll'>AutoScroll</button>
                    
					<div class='btn-group'>
						<button type='button' class='btn btn-xs autorefresh enabled' data-action='autorefresh'>AutoRefresh</button>
 						<button type='button' class='btn btn-xs dropdown-toggle enabled' data-toggle='dropdown' aria-haspopup='true' aria-expanded='false'>
							<span class='caret'></span>
							<span class='sr-only'>Toggle Dropdown</span>
					  	</button>
					  	<ul class='dropdown-menu'>
							<li class='dropdown-header'>Set Refresh Interval</li>
							<li><a href='javascript:' class='interval' data-interval='1000'>1 sec</a></li>
							<li><a href='javascript:' class='interval' data-interval='2000'>2 sec</a></li>
							<li><a href='javascript:' class='interval' data-interval='5000'>5 sec</a></li>
						</ul>
					</div>

					<div class='btn-group'>
						<!--button type='button' class='btn btn-xs prune' data-action='prune'>Prune <span class='badge prune-level'>Off</span></button-->
 						<button type='button' class='btn btn-xs dropdown-toggle' data-action='prune' data-toggle='dropdown' aria-haspopup='true' aria-expanded='false'>
							<span>Prune Rows</span>
							<span class='badge prune-level'>Off</span>
							<span class='caret'></span>
							<span class='sr-only'>Prune Dropdown</span>
					  	</button>
					  	<ul class='dropdown-menu'>
							<li><a href='javascript:' class='prune' data-prune='off'>Off (show full file)</a></li>
							<li><a href='javascript:' class='prune' data-prune='1000'>Last 1000 lines</a></li>
							<li><a href='javascript:' class='prune' data-prune='500'>Last 500 lines</a></li>
							<li><a href='javascript:' class='prune' data-prune='100'>Last 100 lines (default)</a></li>
						</ul>
					</div>
		
                    <button class='btn btn-xs'  					data-action='reload'>Reload</button>
                    <button class='btn btn-xs'                      data-action='reset'>Reset</button>
                    <button class='btn btn-xs'                      data-action='clear'>Clear</button>
                    <button class='btn btn-xs'             			data-action='top'>Top</button>
                    <button class='btn btn-xs' 				        data-action='bottom'>Bottom</button>
                    <label class='exclude_filter'>Exclude:
                        <input type='text' class='form-control input-sm exclude' placeholder='Exclude term'/>
                    </label>
                </div>
                <table id='$name' class='log-table' style='width:100%;'>
                    <thead><tr><th>#</th><th>Lines</th></tr></thead>
                    <tbody></tbody>
                </table>
            </div>
            <script>
                $(document).ready(function() {
                    datatable_setup('$name');
                });
            </script>        
        ";
	}

}
