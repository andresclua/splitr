<?php
/**
 * Plugin Name: Splitr
 * Description: Edge-based A/B testing for WordPress — zero JS, zero flicker.
 * Version: 1.0.0
 * Author: Splitr
 * License: GPL2
 */

if (!defined('ABSPATH')) exit;

define('SPLITR_VERSION', '1.0.0');
define('SPLITR_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('SPLITR_API_BASE', 'https://app.splitr.io');
define('SPLITR_COOKIE_PREFIX', 'sp_');
define('SPLITR_CACHE_EXPIRY', 300); // 5 minutes

// --- Admin settings page ---

add_action('admin_menu', function () {
    add_menu_page('Splitr', 'Splitr', 'manage_options', 'splitr', 'splitr_settings_page', 'dashicons-randomize', 80);
});

function splitr_settings_page() {
    if (isset($_POST['splitr_api_key'])) {
        check_admin_referer('splitr_save_settings');
        update_option('splitr_api_key', sanitize_text_field($_POST['splitr_api_key']));
        echo '<div class="notice notice-success"><p>Settings saved.</p></div>';
    }

    $api_key = get_option('splitr_api_key', '');
    $experiments = splitr_get_experiments();
    ?>
    <div class="wrap">
        <h1>Splitr — A/B Testing</h1>
        <form method="post">
            <?php wp_nonce_field('splitr_save_settings'); ?>
            <table class="form-table">
                <tr>
                    <th>API Key</th>
                    <td>
                        <input type="text" name="splitr_api_key" value="<?php echo esc_attr($api_key); ?>" class="regular-text" placeholder="sk_live_..." />
                        <p class="description">Find your API key in <a href="<?php echo SPLITR_API_BASE; ?>/dashboard/settings" target="_blank">Splitr Dashboard → Settings</a></p>
                    </td>
                </tr>
            </table>
            <?php submit_button('Save Settings'); ?>
        </form>

        <?php if (!empty($experiments)): ?>
        <h2>Active Experiments</h2>
        <table class="wp-list-table widefat fixed striped">
            <thead><tr><th>Name</th><th>Status</th><th>Variants</th></tr></thead>
            <tbody>
            <?php foreach ($experiments as $exp): ?>
                <tr>
                    <td><?php echo esc_html($exp['name']); ?></td>
                    <td><?php echo esc_html($exp['status']); ?></td>
                    <td><?php echo count($exp['variants']); ?></td>
                </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
        <?php endif; ?>
    </div>
    <?php
}

// --- Fetch experiments from API (cached) ---

function splitr_get_experiments(): array {
    $cached = get_transient('splitr_experiments');
    if ($cached !== false) return $cached;

    $api_key = get_option('splitr_api_key', '');
    if (empty($api_key)) return [];

    $response = wp_remote_get(SPLITR_API_BASE . '/api/worker/config', [
        'headers' => ['Authorization' => 'Bearer ' . $api_key],
        'timeout' => 5,
    ]);

    if (is_wp_error($response) || wp_remote_retrieve_response_code($response) !== 200) return [];

    $data = json_decode(wp_remote_retrieve_body($response), true);
    $experiments = $data['experiments'] ?? [];

    set_transient('splitr_experiments', $experiments, SPLITR_CACHE_EXPIRY);
    return $experiments;
}

// --- Traffic splitting via template_redirect ---

add_action('template_redirect', function () {
    $experiments = splitr_get_experiments();
    if (empty($experiments)) return;

    $current_path = $_SERVER['REQUEST_URI'];

    foreach ($experiments as $exp) {
        if ($exp['status'] !== 'active') continue;

        $base_path = parse_url($exp['base_url'], PHP_URL_PATH);
        if (strpos($current_path, $base_path) !== 0) continue;

        $cookie_name = SPLITR_COOKIE_PREFIX . $exp['id'];
        $variant_id  = $_COOKIE[$cookie_name] ?? null;

        if (!$variant_id) {
            $variant_id = splitr_assign_variant($exp['variants']);
            setcookie($cookie_name, $variant_id, time() + 2592000, '/', '', true, true);
            $_COOKIE[$cookie_name] = $variant_id;
        }

        $variant = null;
        foreach ($exp['variants'] as $v) {
            if ($v['id'] === $variant_id) { $variant = $v; break; }
        }
        if (!$variant || $variant['is_control']) return;

        // Redirect to variant URL (server-side, no JS)
        $target = $variant['target_url'];
        if ($target !== $current_path) {
            wp_redirect($target, 302);
            exit;
        }
    }
});

function splitr_assign_variant(array $variants): string {
    $total = array_sum(array_column($variants, 'traffic_weight'));
    $rand  = mt_rand(1, $total);
    $cumulative = 0;
    foreach ($variants as $v) {
        $cumulative += $v['traffic_weight'];
        if ($rand <= $cumulative) return $v['id'];
    }
    return $variants[count($variants) - 1]['id'];
}
