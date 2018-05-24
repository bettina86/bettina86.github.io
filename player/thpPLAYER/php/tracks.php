<?php

$name = $_GET["name"];

// prende solo la prima parte e poi verifica se esistono solo per en o per it i relativi file vtt
$A_name = explode(".", $name);
$_name = $A_name[0];

$en = $_name . "_en.vtt";
$it = $_name . "_it.vtt";

$json = "{ \"" . $en . "\" : [" . (file_exists("uploaded/" . $en) ? "true" : "false") . ", \"English\", \"en\"],\"" 
             . $it . "\" : [" . (file_exists("uploaded/" . $it) ? "true" : "false") . ", \"Italian\", \"it\"]}";

echo $json;

?>