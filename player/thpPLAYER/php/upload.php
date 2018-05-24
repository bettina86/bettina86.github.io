<?php

$fn = $_SERVER["HTTP_X_FILENAME"] ? $_SERVER["HTTP_X_FILENAME"] : false;

if (isset($fn)) 
{
	// scrive il file nel filesystem
	$res = file_put_contents(
		"uploaded/" . $fn,
		file_get_contents("php://input")
	);
    
    if($res > 0)    
	    echo "$fn uploaded e scritto.";
    else
        echo "$fn uploaded ma non scritto." . $res;
	
    exit();
}
else
    echo "$fn not uploaded ";

?>